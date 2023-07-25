import { DiscordClient, LostArkServer, LostMerchantsClient } from "../clients";
import { IMerchant, IMerchantGroup, IMerchantVote } from "../common/interfaces/lost-merchants";
import { bold, spoiler, blockQuote, roleMention } from 'discord.js';
import { Logger } from "../common/logger";
import MerchantData from '../assets/merchants.json'
import { Server } from "../common/enums";

export class NotifyMerchantsService {
    private discord: DiscordClient;
    private lostMerchants: LostMerchantsClient;

    private logger: Logger;

    constructor(discord: DiscordClient, lostMerchants: LostMerchantsClient) {
        this.discord = discord;
        this.lostMerchants = lostMerchants;

        this.logger = new Logger('NotifyMerchantsService');
    }

    async isNewMerchantAppearance(server: LostArkServer, merchantGroup: IMerchantGroup): Promise<boolean> {
        const message = await this.discord.findMessage(
            this.discord.getChannelIdFromServer(server || merchantGroup.server),
            this.getMessageIdentifier(merchantGroup)
        );

        return !message;
    }
    
    async notifyNewMerchantAppearance(server: LostArkServer, merchantGroup: IMerchantGroup): Promise<void> {
        try {
            const channelId = this.discord.getChannelIdFromServer(server || merchantGroup.server);
            const messageIdentifer = this.getMessageIdentifier(merchantGroup);

            const merchant = merchantGroup.activeMerchants[0];

            await this.discord.sendTextWIthImage(
                channelId,
                spoiler(messageIdentifer) +
                '\n' +
                this.getMerchantMessage(server, merchantGroup) +
                '\n' +
                this.getMerchantInfo(merchant),
                `https://lostmerchants.com/images/zones/${merchant.zone.replaceAll(' ', '%20')}.jpg`
            )
        } catch (err) {
            this.logger.error('failed to notify new merchant appearance', err);
        }
    }
    
    async updateMerchantVotes(merchantVote: IMerchantVote): Promise<void> {
        try {
            const message = 
                (await this.discord.findMessage(this.discord.getChannelIdFromServer(Server.Arthetine), merchantVote.id)) ||
                (await this.discord.findMessage(this.discord.getChannelIdFromServer(Server.Blackfang), merchantVote.id)) ||
                (await this.discord.findMessage(this.discord.getChannelIdFromServer(Server.Kazeros), merchantVote.id));

            if (!message) {
                throw new Error('original message not found');
            }

            const originalMessage = message.content;
            const newMessage = originalMessage.substring(0, originalMessage.indexOf('**Votos: **') + 11) + merchantVote.votes;

            await this.discord.editMessage(message, newMessage)
        } catch (err) {
            console.error(err);
            this.logger.info('failed to update merchant votes');
        }
    }

    async replaceWrongMerchantAppearance(server: LostArkServer, merchantGroup: IMerchantGroup): Promise<void> {
        try {
            const message = await this.discord.findMessage(
                this.discord.getChannelIdFromServer(server || merchantGroup.server),
                this.getMessageIdentifier(merchantGroup)
            );

            if (!message) {
                throw new Error('original message not found');
            }

            const messageIdentifer = this.getMessageIdentifier(merchantGroup);
            const merchant = merchantGroup.activeMerchants[0];

            await this.discord.replyMessageWIthImage(
                message,
                spoiler(messageIdentifer) +
                '\n' +
                this.getReplaceMerchantMessage(server, merchantGroup) +
                '\n' +
                this.getMerchantInfo(merchant),
                `https://lostmerchants.com/images/zones/${merchant.zone.replaceAll(' ', '%20')}.jpg`
            )
        } catch (err) {
            this.logger.error('failed to replace wrong merchant appearance', err);
        }
    }

    private getMerchantInfo(merchant: IMerchant): string {
        return blockQuote(
            `${bold(merchant.name)} em ${bold(merchant.zone)}, ${bold(this.getMerchantRegion(merchant))}` +
            '\n' +
            bold('Carta: ') + merchant.card.name +
            '\n' +
            bold('Rapport: ') + merchant.rapport.name +
            '\n' +
            bold('Votos: ') + merchant.votes
        )
    }

    private getMerchantRegion(merchant: IMerchant): string {
        const merchantData = MerchantData as Record<string, any>;
        const data = merchantData[merchant.name];

        return data?.Region || "";
    }

    private getMerchantMessage(server: LostArkServer, merchantGroup: IMerchantGroup): string {
        const merchant = merchantGroup.activeMerchants[0];

        const legendaryMerchants = ["Wei", "Balthorr", "Delain Armen", "Vairgrys"];
        const isLegendary = legendaryMerchants.includes(merchant.card.name);

        if (isLegendary) {
            const roleId = this.discord.getRoleIdFromServer(server || merchantGroup.server);
            return `${roleMention(roleId)} Corre caralho!!! Spawnou coisa boa no mercador (pode ser bait)`;
        } else {
            return 'Merchant inútil spawnou, ignora essa bosta, não vale nada mesmo';
        }
    }


    private getReplaceMerchantMessage(server: LostArkServer, merchantGroup: IMerchantGroup): string {
        const merchant = merchantGroup.activeMerchants[0];

        const legendaryMerchants = ["Wei", "Balthorr", "Delain Armen", "Vairgrys"];
        const isLegendary = legendaryMerchants.includes(merchant.card.name);

        if (isLegendary) {
            const roleId = this.discord.getRoleIdFromServer(server || merchantGroup.server);
            return `${roleMention(roleId)} Ih carai, o primeiro era bait mas ainda pode ser coisa boa (ainda pode ser bait)`;
        } else {
            return 'Se fudeu era bait kkkk, o mercador certo é esse aqui';
        }
    }

    private getMessageIdentifier(merchantGroup: IMerchantGroup): string {
        return `${merchantGroup.id}-${merchantGroup.activeMerchants[0]?.id}`;
    }
}