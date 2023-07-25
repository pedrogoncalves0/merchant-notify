import { Server } from "../enums";

export interface IMerchantGroup {
    id: number;
    server: Server;
    merchantName: string;
    activeMerchants: IMerchant[];
}

export interface IMerchant {
    id: string;
    name: string;
    zone: string;
    card: {
        name: string;
        rarity: number;
    };
    rapport: {
        name: string;
        rarity: number;
    };
    votes: number;
}

export interface IMerchantVote {
    id: string;
    votes: number;
}