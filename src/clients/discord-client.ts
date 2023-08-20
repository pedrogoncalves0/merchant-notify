import { 
    Client, 
    Events,
    GatewayIntentBits,
    TextChannel, 
    MessagePayload, 
    MessageCreateOptions,
    Message,
    AnyThreadChannel
} from 'discord.js';
import { Server } from '../common/enums';

export interface IDiscordClientConfig {
    connection: {
        token: string;
    };
    channels: {
        arthetine: string;
        blackfang: string;
        kazeros: string;
        appLogs: string;
    };
    roles: {
        arthetine: string;
        blackfang: string;
        kazeros: string;
    };
    api: {
        messageBatchSize: number;
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
                },
                roles: {
                    arthetine: process.env.DISCORD_ARTHETINE_ROLE_ID || "",
                    blackfang: process.env.DISCORD_BLACKFANG_ROLE_ID || "",
                    kazeros: process.env.DISCORD_KAZEROS_ROLE_ID || "",
                },
                api: {
                    messageBatchSize: Number(process.env.DISCORD_MESSAGES_BATCH_SIZE || 100)
                }
            });
        }

        return this.instance;
    }

    get arthetineChannelId(): string { return this.config.channels.arthetine }
    get arthetineRoleId(): string { return this.config.roles.arthetine }

    get blackfangChannelId(): string { return this.config.channels.blackfang }
    get blackfangRoleId(): string { return this.config.roles.blackfang }

    get kazerosChannelId(): string { return this.config.channels.kazeros }
    get kazerosRoleId(): string { return this.config.roles.kazeros }

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

    async sendTextToChannel(
        channelId: string,
        data: string,
        silent = false
    ): Promise<Message> {
        const channel = this.getChannel(channelId);
        const args: MessageCreateOptions = { content: data };

        if (silent) args.flags = [4096];

        return channel.send(args);
    }

    async sendTextWIthImage(
        channelId: string,
        data: string,
        url: string,
        silent = false
    ): Promise<Message> {
        const channel = this.getChannel(channelId);
        const args: MessageCreateOptions = {
            content: data,
            files: [url] 
        };

        if (silent) {
            args.flags = [4096];
        }

        return channel.send(args);
    }

    async replyMessageWIthImage(
        message: Message,
        data: string,
        url: string,
        silent = false
    ): Promise<Message> {
        const args: MessageCreateOptions = {
            content: data,
            files: [url] 
        };

        if (silent) {
            args.flags = [4096];
        }

        return message.reply(args);
    }

    async editMessage(
        message: Message,
        data: string
    ): Promise<Message> {
        return message.edit(data);
    }

    async createThread(
        message: Message,
        name: string,
        expiresIn: number = 25 * 60 * 1000
    ): Promise<AnyThreadChannel> {
        const thread = await message.startThread({ name });

        setTimeout(
            async () => {
                try {
                    await thread.delete();
                } catch (err) {
                    console.error('failed to remove thread', err);
                }
            },
            expiresIn
        )

        return thread;
    }

    getChannelIdFromServer(server: Server): string {
        const serverSwitchMap = {
            [Server.Arthetine]: this.arthetineChannelId,
            [Server.Blackfang]: this.blackfangChannelId,
            [Server.Kazeros]: this.kazerosChannelId,
        }

        return serverSwitchMap[server];
    }

    getRoleIdFromServer(server: Server): string {
        const serverSwitchMap = {
            [Server.Arthetine]: this.arthetineRoleId,
            [Server.Blackfang]: this.blackfangRoleId,
            [Server.Kazeros]: this.kazerosRoleId,
        }

        return serverSwitchMap[server];
    }

    async findMessage(channelId: string, contentIdentifier: string): Promise<Message | undefined> {
        const channel = this.getChannel(channelId);
        const messages = await channel.messages.fetch({
            limit: this.config.api.messageBatchSize,
        })

        return messages.find(m => m.content?.includes(contentIdentifier));
    }

    private getChannel(channelId: string): TextChannel {
        const channel = this.client.channels.cache.get(channelId) as TextChannel;

        if (!channel) {
            throw new Error(`[Discord] Channel with ID ${channelId} was not found!`);
        }

        return channel;
    }
}
