import 'dotenv/config'

import { DiscordClient, LostMerchantsClient, MessageType } from "./clients";
import { sleep } from "./common/utils";
import { NotifyMerchantsController } from './controllers';
import { NotifyMerchantsService } from './services';
import { Server } from './common/enums';

const main = async () => {
    const discordClient = DiscordClient.getInstance();
    const lostMerchantsClient = LostMerchantsClient.getInstance();

    await discordClient.connect();
    await lostMerchantsClient.connect();

    new NotifyMerchantsController(
        discordClient,
        lostMerchantsClient
    );

    while(true) {
        console.log('[APP] sleeping...');
        await sleep(60000)
    }
}

main()
    .catch(console.error);