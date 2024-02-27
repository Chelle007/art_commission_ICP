import { Canister, update, query, Vec, Opt, Ok, Result, Record, Variant, Principal, Err, text, bool, nat64, StableBTreeMap, int8 } from 'azle';
import { v4 as uuidv4 } from 'uuid';

// Define types for Artist, Customer, Status, Commission, and Error
const Artist = Record({
    artistID: Principal,
    artistName: text,
    price: nat64,
    number_of_revision: int8
});
type Artist = typeof Artist.tsType;

const Customer = Record({
    customerID: Principal,
    customerName: text
});
type Customer = typeof Customer.tsType;

const Status = Record({
    Pending: bool,
    Accepted: bool,
    Rejected: bool,
    ArtworkSubmitted: bool,
    Approved: bool,
    Cancelled: bool
})
type Status = typeof Status.tsType;

const Commission = Record({
    commissionID: Principal,
    customerID: Principal,
    artistID: Principal,
    price: nat64,
    remaining_revision: int8,
    artURL: text,
    status: Status
});
type Commission = typeof Commission.tsType;

const Error = Variant({
    NotFound: text,
    NoRemainingRevision: text,
    InvalidTransaction: text
})
type Error = typeof Error.tsType;

// Map to store artists, customers, and commissions
let artists = StableBTreeMap<Principal, Artist>(0);
let customers = StableBTreeMap<Principal, Customer>(1);
let commissions = StableBTreeMap<Principal, Commission>(2);

export default Canister({
    // Method for artist to create a new profile
    createArtist: update([text, nat64, int8], Artist, (artistName, price, number_of_revision) => {
        // Validate inputs
        if (!artistName || !price || !number_of_revision) {
            return Err({ InvalidInput: 'Missing required fields in the artist object' });
        }

        // Generate a unique ID for the artist
        const artistID = uuidv4();
        const artist: Artist = {
            artistID,
            artistName,
            price,
            number_of_revision
        };

        // Add the artist to the artists map
        artists.insert(artist.artistID, artist);

        return artist;
    }),

    // Method to retrieve all artists
    readArtists: query([], Vec(Artist), () => {
        return artists.values();
    }),

    // Method to retrieve an artist by their ID
    readArtistById: query([Principal], Opt(Artist), (id) => {
        return artists.get(id);
    }),

    // Method for customer to create a new profile
    createCustomer: update([text], Customer, (customerName) => {
        // Validate inputs
        if (!customerName) {
            return Err({ InvalidInput: 'Missing required fields in the customer object' });
        }

        // Generate a unique ID for the customer
        const customerID = uuidv4();
        const customer: Customer = {
            customerID,
            customerName
        };

        // Add the customer to the customers map
        customers.insert(customer.customerID, customer);

        return customer;
    }),

    // Method to retrieve all customers
    readCustomers: query([], Vec(Customer), () => {
        return customers.values();
    }),

    // Method to retrieve a customer by their ID
    readCustomerById: query([Principal], Opt(Customer), (id) => {
        return customers.get(id);
    }),

    // Method to retrieve all commissions
    readCommissions: query([], Vec(Commission), () => {
        return commissions.values();
    }),

    // Method to retrieve a commission by its ID
    readCommissionById: query([Principal], Opt(Commission), (id) => {
        return commissions.get(id);
    }),

    // FOR CLIENT
    // Method for client to set a new commission for specific artist
    createCommission: update([Principal, Principal], Result(Commission, Error), (artistID, customerID) => {
        const artistOpt = artists.get(artistID);
        if ("None" in artistOpt) {
            return Err({ NotFound: `cannot create the commission: artist=${artistID} not found` });
        }
        const artist = artistOpt.Some;

        const customerOpt = customers.get(customerID);
        if ("None" in customerOpt) {
            return Err({ NotFound: `cannot create the commission: customer=${customerID} not found` });
        }

        // Generate a unique ID for the commission
        const commissionID = uuidv4();
        const commission: Commission = {
            commissionID,
            customerID,
            ...artist,
            remaining_revision: artist.number_of_revision,
            artURL: "",
            status: { 
                Pending: true,
                Accepted: false,
                Rejected: false,
                ArtworkSubmitted: false,
                Approved: false,
                Cancelled: false
            }
        }

        // Add the commission to the commissions map
        commissions.insert(commissionID, commission);
        return Ok(commission);
    }),

    // Method for client to end the commission by approving the artwork
    approveCommission: update([Principal], Result(Commission, Error), (commissionID) => {
        const commissionOpt = commissions.get(commissionID);
        if ("None" in commissionOpt) {
            return Err({ NotFound: `cannot approve commission: commission=${commissionID} not found` });
        }
        const commission = commissionOpt.Some;

        const commissionValidity = checkCommissionValidity(commission.status, "approve commission");
        if (commissionValidity!=="valid") {
            return Err({ InvalidTransaction: commissionValidity});
        }
        
        // Update the status of the commission
        commission.status.Approved = true;
        commissions.insert(commissionID, commission);
        return Ok(commission);
    }),

    // Method for client to request revision
    requestRevision: update([Principal], Result(Commission, Error), (commissionID) => {
        const commissionOpt = commissions.get(commissionID);
        if ("None" in commissionOpt) {
            return Err({ NotFound: `cannot request revision: commission=${commissionID} not found` });
        }
        const commission = commissionOpt.Some;

        const commissionValidity = checkCommissionValidity(commission.status, "request revision");
        if (commissionValidity!=="valid") {
            return Err({ InvalidTransaction: commissionValidity});
        }
        
        if (commission.remaining_revision === 0) {
            return Err({ NoRemainingRevision: "no more revision can be made" });
        }
        
        // Update the remaining revisions and the status of the commission
        commission.remaining_revision--;
        commission.status.ArtworkSubmitted = false;
        commissions.insert(commissionID, commission);
        return Ok(commission);
    }),

    // FOR ARTIST
    // Method for artist to accept the commission
    acceptCommission: update([Principal], Result(Commission, Error), (commissionID) => {
        const commissionOpt = commissions.get(commissionID);
        if ("None" in commissionOpt) {
            return Err({ NotFound: `cannot accept commission: commission=${commissionID} not found` });
        }
        const commission = commissionOpt.Some;

        const commissionValidity = checkCommissionValidity(commission.status, "accept commission");
        if (commissionValidity!=="valid") {
            return Err({ InvalidTransaction: commissionValidity});
        }
        
        // Update the status of the commission
        commission.status.Accepted = true;
        commissions.insert(commissionID, commission);
        return Ok(commission);
    }),

    // Method for artist to reject the commission
    rejectCommission: update([Principal], Result(Commission, Error), (commissionID) => {
        const commissionOpt = commissions.get(commissionID);
        if ("None" in commissionOpt) {
            return Err({ NotFound: `cannot reject commission: commission=${commissionID} not found` });
        }
        const commission = commissionOpt.Some;

        const commissionValidity = checkCommissionValidity(commission.status, "reject commission");
        if (commissionValidity!=="valid") {
            return Err({ InvalidTransaction: commissionValidity});
        }
        
        // Update the status of the commission
        commission.status.Rejected = true;
        commissions.insert(commissionID, commission);
        return Ok(commission);
    }),

    // Method for artist to submit the artwork
    submitArtwork: update([Principal, text], Result(Commission, Error), (commissionID, artURL) => {
        const commissionOpt = commissions.get(commissionID);
        if ("None" in commissionOpt) {
            return Err({ NotFound: `cannot submit artwork: commission=${commissionID} not found` });
        }
        const commission = commissionOpt.Some;

        const commissionValidity = checkCommissionValidity(commission.status, "submit artwork");
        if (commissionValidity!=="valid") {
            return Err({ InvalidTransaction: commissionValidity});
        }
        
        // Validate inputs
        if (!artURL) {
            return Err({ InvalidInput: 'Missing required fields in the artwork object' });
        }

        // Update the URL of the artwork and the status of the commission
        commission.artURL = artURL;
        commission.status.ArtworkSubmitted = true;
        commissions.insert(commissionID, commission);
        return Ok(commission);
    }),

    // FOR BOTH PARTIES
    // Method for both parties to cancel the commission
    cancelCommission: update([Principal], Result(Commission, Error), (commissionID) => {
        const commissionOpt = commissions.get(commissionID);
        if ("None" in commissionOpt) {
            return Err({ NotFound: `cannot cancel commission: commission=${commissionID} not found` });
        }
        const commission = commissionOpt.Some;

        const commissionValidity = checkCommissionValidity(commission.status,"cancel commission");
        if (commissionValidity!=="valid") {
            return Err({ InvalidTransaction: commissionValidity});
        }
        
        // Update the status of the commission
        commission.status.Cancelled = true;
        commissions.insert(commissionID, commission);
        return Ok(commission);
    }),

})

// Method to randomly generate ID in Principal type
function generateId(): Principal {
    // Use a more secure method like generating a UUID using a cryptographic library
    const randomBytes = uuidv4();
    return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}

// Method to check commission's validity
function checkCommissionValidity(status: Status, methodType: string): string {
    let commissionValidity = "valid";
    if (status.Cancelled) commissionValidity = "commission has been cancelled";
    else if (status.Approved) commissionValidity = "commission has ended";
    else if (status.Rejected) commissionValidity = "commission has been rejected";
    else if (!status.Accepted && (methodType !== "accept commission" && methodType !== "reject commission")) commissionValidity = "commission has yet to be accepted";
    else if (status.Accepted && (methodType === "accept commission" || methodType === "reject commission")) commissionValidity = "commission has been accepted";
    else if (!status.ArtworkSubmitted && (methodType === "approve commission" || methodType === "request revision")) commissionValidity = "artwork not finished";
    else if (methodType === "request revision" && status.remaining_revision === 0) commissionValidity = "no more revision can be made";

    if (commissionValidity!= "valid") return `cannot ${methodType}: ${commissionValidity}`;
    else return "valid";
}
