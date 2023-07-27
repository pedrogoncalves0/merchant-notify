import { DiscordClient, LostArkServer, LostMerchantsClient, MessageType } from "../clients";
import { IMerchantGroup, IMerchantVote } from "../common/interfaces/lost-merchants";
import { NotifyMerchantsService } from "../services";

export class NotifyMerchantsController {
    private service: NotifyMerchantsService;

    private lostMerchants: LostMerchantsClient;

    constructor(discord: DiscordClient, lostMerchants: LostMerchantsClient) {
        this.service = new NotifyMerchantsService(discord, lostMerchants);
        this.lostMerchants = lostMerchants;

        this.init();
    }

    init(): void {    
        this.lostMerchants
            .onMessage<IMerchantVote[]>(MessageType.UpdateVotes, this.handleUpdateVotes.bind(this));

        this.lostMerchants
            .onMessage<IMerchantGroup>(MessageType.UpdateMerchantGroup, this.handleUpdateMerchantGroup.bind(this));
    }

    async handleUpdateMerchantGroup(server: LostArkServer, data: IMerchantGroup): Promise<void> {
        const isNewMerchantAppearance = await this.service.isNewMerchantAppearance(server, data);

        if (isNewMerchantAppearance) {
            if (!this.service.canNotifyMerchant(data)) {
                console.warn('ignoring merchant notification');
                return;
            }

            await this.service.notifyNewMerchantAppearance(server, data);
        } else {
            await this.service.replaceWrongMerchantAppearance(server, data);
        }
    }

    async handleUpdateVotes(_server: LostArkServer, data: IMerchantVote[]): Promise<void> {
        for (let vote of data) {
            await this.service.updateMerchantVotes(vote);
        }
    }
}