import { Canister, update, query, Vec, Opt, Ok, Result, Record, Variant, Principal, Err, text, nat64, blob, bool, StableBTreeMap } from 'azle';

const Artist = Record({
    artistID: Principal,
    artistName: text,
    price: nat64,
    number_of_revision: nat64
});
type Artist = typeof Artist.tsType;

const Customer = Record({
    customerID: Principal,
    customerName: text
});
type Customer = typeof Customer.tsType;

const Status = Variant({
    Pending: text,
    Accepted: text,
    Rejected: text,
    ArtworkSubmitted: text,
    Approved: text,
    Cancelled: text
})
type Status = typeof Status.tsType;

const Transaction = Record({
    transactionID: Principal,
    customerID: Principal,
    artistID: Principal,
    price: nat64,
    remaining_revision: nat64,
    artURL: text,
    status: Status
});
type Transaction = typeof Transaction.tsType;

const Error = Variant({
    NotFound: text,
    InvalidPayload: text
})
type Error = typeof Error.tsType;

let artists = StableBTreeMap<Principal, Artist>(0);
let customers = StableBTreeMap<Principal, Customer>(1);
let transactions = StableBTreeMap<Principal, Transaction>(2);

export default Canister({
    createArtist: update([text, nat64, nat64], Artist, (artistName, price, number_of_revision) => {
        const artistID = generateId();
        const artist: Artist = {
            artistID,
            artistName,
            price,
            number_of_revision
        };

        artists.insert(artist.artistID, artist);

        return artist;
    }),

    readArtists: query([], Vec(Artist), () => {
        return artists.values();
    }),

    readArtistById: query([Principal], Opt(Artist), (id) => {
        return artists.get(id);
    }),

    createCustomer: update([text], Customer, (customerName) => {
        const customerID = generateId();
        const customer: Customer = {
            customerID,
            customerName
        };

        customers.insert(customer.customerID, customer);

        return customer;
    }),

    readCustomer: query([], Vec(Customer), () => {
        return customers.values();
    }),

    readCustomerById: query([Principal], Opt(Customer), (id) => {
        return customers.get(id);
    }),

    // FOR CLIENT
    createCommission: update([Principal, Principal], Result(Transaction, Error), (artistID, customerID) => {
        const artistOpt = artists.get(artistID);
        if ("None" in artistOpt) {
            return Err({ NotFound: `cannot create the transaction: artist=${artistID} not found` });
        }
        const artist = artistOpt.Some;

        const customerOpt = customers.get(customerID);
        if ("None" in customerOpt) {
            return Err({ NotFound: `cannot create the transaction: customer=${customerID} not found` });
        }

        const transactionID = generateId();
        const transaction: Transaction = {
            transactionID,
            customerID,
            ...artist,
            remaining_revision: artist.number_of_revision,
            artURL: "",
            status: { Pending: "Commission created" }
        }

        transactions.insert(transactionID, transaction);
        return Ok(transaction);
    }),

    approveArtwork:

    requestRevision:

    // FOR ARTIST
    acceptCommission:

    rejectCommission:

    submitArtwork:

    // FOR BOTH PARTIES
    cancelCommission:

})

function generateId(): Principal {
    const randomBytes = new Array(29)
        .fill(0)
        .map((_) => Math.floor(Math.random() * 256));

    return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}