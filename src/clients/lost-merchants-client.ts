import { client as WebSocketClient, connection as WebSocketConnection } from 'websocket'
import { Logger } from '../common/logger'
import { sleep } from '../common/utils'
import { Server } from '../common/enums';
import { IMerchantGroup, IMerchantVote } from '../common/interfaces/lost-merchants';

export interface ILostMarchantsClientConfig {
    connection: {
        wssUri: string;
        maxRetriesAllowed: number;
        retriesInterval: number;
    };
}

export enum MessageType {
    UpdateMerchantGroup = 'UPDATE_MERCHANT_GROUP',
    UpdateVotes = 'UPDATE_VOTES',
    GetKnownActiveMerchantGroupsResponse = 'GET_KNOWN_ACTIVE_MERCHANT_GROUPS_RESPONSE'
}

type MessageCallback<T = any> = (server: LostArkServer, data: T) => void;

export type LostArkServer = Server | null | undefined;

export class LostMerchantsClient {
    private logger: Logger;
    private config: ILostMarchantsClientConfig;

    private wssClient: WebSocketClient;
    private wssConnection: WebSocketConnection | undefined;
    private isClientConnected: boolean;

    private registeredCallbacks: Map<MessageType, Array<MessageCallback>> = new Map();

    private static instance: LostMerchantsClient;

    private constructor(config: ILostMarchantsClientConfig) {
        this.logger = new Logger('LostMerchantsClient');
        this.config = config;

        this.wssClient = new WebSocketClient();
        this.wssConnection = undefined;
        this.isClientConnected = false;
    }

    get isConnected(): boolean { return this.isClientConnected }

    public static getInstance(): LostMerchantsClient {
        if (!this.instance) {
            this.instance = new LostMerchantsClient({
                connection: {
                    wssUri: process.env.LOST_MERCHANTS_WSS_URI || "",
                    maxRetriesAllowed: Number(process.env.LOST_MERCHANTS_MAX_RETRIES_ALLOWED || 10),
                    retriesInterval: Number(process.env.LOST_MERCHANTS_RETRIES_INTERVAL || 5000),
                },
            });
        }

        return this.instance;
    }

    public onMessage<T>(type: MessageType, callback: MessageCallback<T>): void {
        if (this.registeredCallbacks.has(type)) {
            this.registeredCallbacks.get(type)?.push(callback);
        } else {
            this.registeredCallbacks.set(type, [callback])
        }
    }

    async connect(): Promise<WebSocketConnection> {
        if (this.isConnected) {
            if (!this.wssConnection) {
                throw new Error('server is connected but no connection object was found');
            }

            return this.wssConnection;
        }

        this.logger.info('connecting to wss server');

        return new Promise((resolve, reject) => {
            this.wssClient.on('connectFailed', (err) => {
                this.logger.error(err.toString());
                this.isClientConnected = false;
                this.wssConnection = undefined;

                reject(err);
            });

            this.wssClient.on('connect', (connection: WebSocketConnection) => {
                this.logger.info('wss client connected');
                this.isClientConnected = true;
                this.wssConnection = connection;

                this.registerDefaultListeners(connection);

                this.sendProtocolMessage();
                this.subscribeToServers();

                resolve(connection);
            });

            this.wssClient.connect(
                this.config.connection.wssUri,
            );
        });
    }

    async reconnect(attempts: number = 0): Promise<void> {
        this.logger.info('reconnecting to wss server...');

        try {
            await this.connect();
        } catch (err) {
            const maxRetriesAllowed = this.config.connection.maxRetriesAllowed;
            const retriesInterval = this.config.connection.retriesInterval;

            if (attempts < maxRetriesAllowed) {
                this.logger.info(`retrying server reconnection, ${attempts} out of ${maxRetriesAllowed} retries were made`);
                
                await sleep(retriesInterval);
                await this.reconnect(attempts + 1);
            } else {
                this.isClientConnected = false;
                this.wssConnection = undefined;

                throw new Error('server connection is lost and no more reconnect retry will be made!');
            }
        }
    }

    private registerDefaultListeners(connection: WebSocketConnection): void {
        this.logger.info('registering default listeners');

        connection.on('error', (err) => {
            this.logger.error(err.toString());
        });

        connection.on('close', () => {
            this.logger.error('echo-protocol Connection Closed');
            this.isClientConnected = false;
            this.wssConnection = undefined;

            this.reconnect()
                .catch(e => this.logger.error('error on reconnect', e));
        });

        connection.on('message', (message) => {
            this.logger.info('processing server message');

            if (message?.type === 'utf8') {
                try {
                    const data = message.utf8Data.replaceAll('', '')
                    const payload = JSON.parse(data) as Record<string, any> | undefined;

                    this.processEventMessage(data, payload);
                } catch (err) {
                    this.logger.error(`failed to parse server message`, err);
                }
            } else {
                this.logger.info(`invalid message type received: ${message?.type}`);
            }
        });
    }

    private processEventMessage(originalPayload: string, data?: Record<string, any>): void {
        if (data) {
            if (data.target == "UpdateMerchantGroup") {
                const [ server, merchantGroup ] = data.arguments;

                this.registeredCallbacks
                    .get(MessageType.UpdateMerchantGroup)
                    ?.forEach((callback) => 
                        callback(server as Server, merchantGroup as IMerchantGroup)
                    )
            } else if (data.target == "UpdateVotes") {
                const [ votesUpdated ] = data.arguments;

                this.registeredCallbacks
                    .get(MessageType.UpdateVotes)
                    ?.forEach((callback) => 
                        callback(null, votesUpdated as IMerchantVote[])
                    )
            } else if (Array.isArray(data.result) && data.result.length) {
                const results = data.result;

                this.registeredCallbacks
                    .get(MessageType.GetKnownActiveMerchantGroupsResponse)
                    ?.forEach((callback) => 
                        callback(null, results as IMerchantGroup[])
                    )
            } else {
                this.logger.info(`unknown data received from server: ${originalPayload}`);
                return;
            }
        } else {
            this.logger.info(`received empty data from server: ${originalPayload}`);
        }
    }

    private validateServerConnected(): boolean {
        if (this.isConnected) {
            if (!this.wssConnection) {
                throw new Error('server is connected but no connection object was found');
            }

            return true;
        }

        return false;
    }

    private sendProtocolMessage(): void {
        if (this.validateServerConnected()) {
            this.logger.info('sending protocol definition message');
            this.wssConnection?.sendUTF('{"protocol":"json","version":1}');
        }
    }

    private subscribeToServer(server: Server): void {
        if (this.validateServerConnected()) {
            this.logger.info(`sending SubscribeToServer message to ${server} server`);
            this.wssConnection
                ?.sendUTF(`{"arguments":["${server}"],"invocationId":"0","target":"SubscribeToServer","type":1}`);
        }
    }

    private subscribeToServers(): void {
        this.subscribeToServer(Server.Arthetine);
        this.subscribeToServer(Server.Blackfang);
        this.subscribeToServer(Server.Kazeros);
    }

    public triggerGetKnownActiveMerchantGroups(server: Server): void {
        if (this.validateServerConnected()) {
            this.logger.info(`sending GetKnownActiveMerchantGroups message to ${server} server`);
            this.wssConnection
                ?.sendUTF(`{"arguments":["${server}"],"invocationId":"0","target":"GetKnownActiveMerchantGroups","type":1}`);
        }
    }
}