import 'dotenv/config'

import { DiscordClient, LostMerchantsClient, MessageType } from "./clients";
import { sleep } from "./common/utils";
import { Server } from './common/enums';
import { IMerchantGroup, IMerchantVote } from './common/interfaces/lost-merchants';

const main = async () => {
    const discordClient = DiscordClient.getInstance();
    const lostMerchantsClient = LostMerchantsClient.getInstance();

    await discordClient.connect();
    await lostMerchantsClient.connect();

    lostMerchantsClient.onMessage<IMerchantGroup[]>(MessageType.GetKnownActiveMerchantGroupsResponse, (server, data) => {
        console.log('GetKnownActiveMerchantGroupsResponse', server, data);
    });

    lostMerchantsClient.onMessage<IMerchantVote>(MessageType.UpdateVotes, (server, data) => {
        console.log('UpdateVotes', server, data);
    });

    lostMerchantsClient.onMessage<IMerchantGroup>(MessageType.UpdateMerchantGroup, (server, data) => {
        console.log('UpdateMerchantGroup', server, data);
    });

    lostMerchantsClient.triggerGetKnownActiveMerchantGroups(Server.Arthetine);

    while(true) {
        console.log('[APP] sleeping...');
        await sleep(60000)
    }
}

main()
    .catch(console.error);