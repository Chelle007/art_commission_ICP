import { Canister, update, query, Vec, Opt, Result, Record, Principal, text, nat64, blob, bool, StableBTreeMap } from 'azle';

const Artist = Record({
    id: Principal,
    name: text,
    price: nat64,
    number_of_revision: nat64
});
type Artist = typeof Artist.tsType;

const Customer = Record({
    id: Principal,
    name: text
});
type Customer = typeof Customer.tsType;

const Transaction = Record({
    id: Principal,
    artist: Principal,
    customer: Principal,
    art: blob,
    price: nat64,
    createdAt: nat64,
    completed: bool,
    canceled: bool
});
type Transaction = typeof Transaction.tsType;

let artists = StableBTreeMap<Principal, Artist>(0);
let customers = StableBTreeMap<Principal, Customer>(1);
let transactions = StableBTreeMap<Principal, Transaction>(2);

export default Canister({
    createArtist: update([text, nat64, nat64], Artist, (name, price, number_of_revision) => {
        const id = generateId();
        const artist: Artist = {
            id,
            name,
            price,
            number_of_revision
        };

        artists.insert(artist.id, artist);

        return artist;
    }),

    readArtists: query([], Vec(Artist), () => {
        return artists.values();
    }),

    readArtistById: query([Principal], Opt(Artist), (id) => {
        return artists.get(id);
    }),

    createCustomer: update([text], Customer, (name) => {
        const id = generateId();
        const customer: Customer = {
            id,
            name
        };

        customers.insert(customer.id, customer);

        return customer;
    }),

    readCustomer: query([], Vec(Customer), () => {
        return customers.values();
    }),

    readCustomerById: query([Principal], Opt(Customer), (id) => {
        return customers.get(id);
    }),

    createTransaction: update([Principal], Transaction, (artist) => {

    }),

})
/*
$query;
export function getArtistDetails(): Result<Vec<Artist>, string> {
    try {
        return Result.Ok(artistList.values);
    } catch (error: any) {
        return Result.Err(`Error getting artist details: ${error}`);
    }
}

//CUSTOMER

export function commission(): {

}

export function accept(): {

}

export function reject(): {

}

export function customerCancel(): {

}

//ARTIST

export function uploadImage(): {

}

export function artistCancel(): {

}
*/

function generateId(): Principal {
    const randomBytes = new Array(29)
        .fill(0)
        .map((_) => Math.floor(Math.random() * 256));

    return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}