/*
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Transfers drugs to new owner if asset is verified
 * @param {org.taak2.drugs.Transfer} Transfer
 * @transaction
 */

async function Transfer(tx) {

    // Create new event to log outcome of transfer
    let transferEvent = getFactory().newEvent('org.taak2.drugs', 'TransferEvent');
    transferEvent.drug = tx.drug;
    let errorStr = '';

    // Check if drug is quarantined
    if (!tx.drug.quarantine) {

        //  Check if currentOwner is correct userType
        let typeCorrect = false;
        if ((tx.newOwner.userType == 'distributer' && tx.drug.currentOwner.userType == 'manufacturer') ||
        (tx.newOwner.userType == 'pharmacist' && tx.drug.currentOwner.userType == 'distributer') ||
        (tx.newOwner.userType == 'patient' && tx.drug.currentOwner.userType == 'pharmacist'))
            typeCorrect = true;
        else
            errorStr += 'U';

        // Check if hash is correct
        let hashCorrect = false;

        let str = tx.productcode + tx.batch + tx.manufacturerId;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            let char = str.charCodeAt(i);
            hash = ((hash<<5)-hash)+char;
            hash = hash & hash;
        }
        
        if (hash == tx.drug.drugHash)
            hashCorrect = true;
        else {
            // Determine error
            if (tx.productcode != tx.drug.productcode)
                errorStr += 'P';
            if (tx.batch != tx.drug.batch)
                errorStr += 'B';
            if (tx.manufacturerId != tx.drug.manufacturerId)
                errorStr += 'M';
        }

        // Transfer drug is type and hash correct, else quarantine
        if (typeCorrect == true && hashCorrect == true) {
            tx.drug.currentOwner = tx.newOwner;
            transferEvent.newOwner = tx.newOwner;
        }
        else {
            tx.drug.quarantine = true;
            errorStr += 'Q'
        }
            
        // Update state
        const drugRegistry = await getAssetRegistry('org.taak2.drugs.Drug');
        await drugRegistry.update(tx.drug);
        
    }
    else {
        errorStr += '*Q';
    }

    // Emit event with outcome transaction
    transferEvent.error = errorStr;
    emit(transferEvent);
}
