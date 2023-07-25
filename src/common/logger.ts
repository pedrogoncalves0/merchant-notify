import { DiscordClient } from "../clients";

export interface ILoggerConfig {
    sendAppLogToDiscord: boolean;
}

export class AppLogger {
    private config: ILoggerConfig;
    private discord: DiscordClient;

    private static instance: AppLogger;

    private constructor(config: ILoggerConfig)  {
        this.config = config;
        this.discord = DiscordClient.getInstance();
    }

    public static getInstance(): AppLogger {
        if (!this.instance) {
            this.instance = new AppLogger({
                sendAppLogToDiscord: process.env.SEND_APP_LOG_TO_DISCORD === 'true',
            });
        }

        return this.instance;
    }

    public async sendToDiscord(data: string): Promise<void> {
        if (!this.config.sendAppLogToDiscord) {
            return;
        }

        try {
            await this.discord
                .sendTextToChannel(
                    this.discord.appLogsChannelId,
                    data,
                )
        } catch (err) {
            console.error('[AppLogger] Failed to send log message to discord', err);
        }
    }
}

export class Logger {
    private context: string;
    private appLogger: AppLogger;

    constructor(context: string) {
        this.context = context;
        this.appLogger = AppLogger.getInstance();
    }

    private mountLogMessage(log: string, type: string): string {
        return `[${this.context}] [${type}] ${log}`;
    }

    error<TError = Error>(log: string, error?: TError): void {
        const logMessage = this.mountLogMessage(log, 'error');
        this.appLogger.sendToDiscord(`${logMessage}\n\t${error?.toString()}`);

        console.error(logMessage, error);
    }

    warn(log: string): void {
        const logMessage = this.mountLogMessage(log, 'warn');
        this.appLogger.sendToDiscord(logMessage);

        console.warn(logMessage);
    }

    info(log: string): void {
        const logMessage = this.mountLogMessage(log, 'info');

        console.info(logMessage);
    }
}