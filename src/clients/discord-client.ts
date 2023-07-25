import { Client, Events, GatewayIntentBits, Channel } from 'discord.js';

export interface IDiscordClientConfig {
    connection: {
        token: string;
    };
    channels: {
        arthetine: string;
        blackfang: string;
        kazeros: string;
        appLogs: string;
    }
}

export class DiscordClient {
    private client: Client;
    private config: IDiscordClientConfig;
    private isClientConnected: boolean;

    private static instance: DiscordClient;

    private constructor(config: IDiscordClientConfig) {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
        this.config = config;
        this.isClientConnected = false;

        this.client.on(Events.Error, e => console.error(`[Discord] error: `, e?.message || e));
    }

    public static getInstance(): DiscordClient {
        if (!this.instance) {
            this.instance = new DiscordClient({
                connection: {
                    token: process.env.DISCORD_BOT_TOKEN || "",
                },
                channels: {
                    arthetine: process.env.DISCORD_ARTHETINE_CHANNEL_ID || "",
                    blackfang: process.env.DISCORD_BLACKFANG_CHANNEL_ID || "",
                    kazeros: process.env.DISCORD_KAZEROS_CHANNEL_ID || "",
                    appLogs: process.env.DISCORD_APP_LOGS_CHANNEL_ID || "",
                }
            });
        }

        return this.instance;
    }

    get arthetineChannelId(): string { return this.config.channels.arthetine }

    get blackfangChannelId(): string { return this.config.channels.blackfang }

    get kazerosChannelId(): string { return this.config.channels.kazeros }

    get appLogsChannelId(): string { return this.config.channels.appLogs }

    get isConnected(): boolean { return this.isClientConnected }

    async connect(): Promise<void> {
        console.log('[Discord] Connecting...');

        if (this.isClientConnected) {
            console.log('[Discord] Already connected');

            return;
        }

        return new Promise(async (resolve, reject) => {
            try {
                this.client.once(Events.ClientReady, c => {
                    console.log(`[Discord] Connected! Logged in as ${c.user.tag}`);
                    this.isClientConnected = true;

                    resolve();
                });

                await this.client.login(this.config.connection.token);
            } catch (err) {
                reject(err);
            }
        });
    }

    async sendTextToChannel<TData = string>(channelId: string, data: TData): Promise<void> {
        const channel = this.client.channels.cache.get(channelId) as Channel & { send: any };

        if (!channel) {
            throw new Error(`[Discord] Channel with ID ${channelId} was not found!`);
        }

        console.log(channel)

        await channel.send(data);
    }
}
