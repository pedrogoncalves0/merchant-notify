import 'dotenv/config'

import { DiscordClient, LostMerchantsClient } from "./clients";
import { sleep } from "./common/utils";
import { NotifyMerchantsController } from './controllers';

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