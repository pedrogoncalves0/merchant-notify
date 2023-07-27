import 'dotenv/config'

import { DiscordClient, LostMerchantsClient } from "./clients";
import { sleep } from "./common/utils";
import { NotifyMerchantsController } from './controllers';
import { Server } from './common/enums';

const testMerchantGroupId = Date.now();
const testMerchantId = "f1f3af57-e7b3-4f13-1dab-08db8b0b9b01";

const sendTestLegendaryNotification = async (controller: NotifyMerchantsController) => 
    controller.handleUpdateMerchantGroup(
        Server.Arthetine,
        {
            "id": testMerchantGroupId,
            "server": Server.Arthetine,
            "merchantName": "Test",
            "activeMerchants": [
                {
                    "id": testMerchantId,
                    "name": "Ben",
                    "zone": "Loghill",
                    "card": {
                        "name": "Wei",
                        "rarity": 3
                    },
                    "rapport": {
                        "name": "Prideholme Potato",
                        "rarity": 3
                    },
                    "votes": 157
                }
            ]
        }
    );

const sendTestUpdateVotesEvent = async (controller: NotifyMerchantsController) =>
    controller.handleUpdateVotes(
        Server.Arthetine,
        [
            {
                "id": testMerchantId,
                "votes": 999
            }
        ]
    );

const main = async () => {
    const discordClient = DiscordClient.getInstance();
    const lostMerchantsClient = LostMerchantsClient.getInstance();

    await discordClient.connect();
    await lostMerchantsClient.connect();

    new NotifyMerchantsController(
        discordClient,
        lostMerchantsClient
    );

    console.log('[APP] sleeping...');

    while(true) {
        await sleep(120000)
    }
}

main()
    .catch(console.error);