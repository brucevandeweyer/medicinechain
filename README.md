# medicinechain
*Prototype for medicine supply chain - Hyperledger Composer / Playground*

## How does it work?

Medicine supply chain in which four usertypes (Manufacturer, Distributer, Pharmacist, Patient) create and transfer medicine assets. All users verify the hashcode of the asset they want to buy. Transfers are committed if hashes match. If hashes don't match, the medicine is quarantined and can no longer be transfered. 

Users are forced to operate under these additional restrictions:

- Only manufacturers can create new assets.
- Only Distributers, Pharmacists and Patients can create transfer.
- Users can only trade with other users who are one step up in the distribution chain.

## Content

- **lib/logic.js**: The **Transfer** transaction function executes the following steps:
  - 25-28: Create new event to send the result of the transaction
  - 30-31/79-82: Check quarantined status of asset and decide to execute transaction or not
  - 34-40: Check if asset can be transfered to requesting user
  - 42-54: Calculate hashcode based on metadata and compare with hascode of asset
  - 55-63: If hascodes don't match, log source of error in event
  - 65-73: If requirements are met, transfer ownership of asset. Else make asset quarantined
  - 75-77: Update state
  - 84-86: Submit event
  
- **models/org.taak2.drugs.cto**
  - **User** participant has a unique *userId* and a *userType* which represents one of the four roles in the network (manufacturer, distributer, pharmacist or patient).
  - **Drug** asset has a unique *serial* and metadata (*productcode*, *batch*, *manufacturerId*). The *drugHash* is based on this metadata and provided by the manufacturer. The *quarantine* property changes from the default false to true, depending on the outcome of a Transfer transaction. *currentOwner* is the User who is the owner of the asset.
  - **Transfer** transaction links the asset that's being transfered and receives from the *newOwner* (the User initiating the Transfer) the relevant metadata.
  - **TransferEvent** event logs the outcome and possible errors of the Transfer.

- **permissions.acl**
  - Next to the *admin* and *SystemACL* who get access to everything, the **Users** are broken up in two groups:
    - **Manufacturers** - the *ManufacturersCanCreateDrug* rule makes sure that only manufacturers can create assets, but they can't do transfers
    - **Traders** - the *TraderCanCreateTransfer* rule makes sure that only distributers, pharmacists and patients can create transfer, but they can't add new assets
  - The *UsersCanOnlyReadDrugsOneStepUp* rule makes sure that Users can only read the assets they own or the assets they can transfer (which means they can only see the assets who are one step up in the supply chain). This way Traders only get the information they are entitled to
  - The *UserCanReadAllUsers*, *UsersCannotReadAnyTransfers* and *UsersCannotReadAnyHistoricalTransactions* rules make sure that User only get the information they need to make succesful transaction (and nothing more)
  
- **curl.sh**: This script can be executed with the admin account when the REST server is online and does the following:
  - 4 Users are created, one of each type
  - 3 assets are created:
    - **Drug#1** follows a happy path from manufacturer (User#1) to patient (User#4) and doesn't get quarantined along the way
    - **Drug#2** gets quarantined by the distributer (User#2) because the patient is trying to buy it (error 'UQ' in event log)
    - **Drug#3** gets quarantined by the pharmacist (User#3) because the patient is trying to buy it with the wrong metadata and hascode (error 'PMQ' in event log)
    - Last transaction of Drug#3 is denied because the asset is quarantined (error 'Q' in event log)
