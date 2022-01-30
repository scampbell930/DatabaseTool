const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const readline = require("readline");
const fs = require('fs');
const crypto = require('crypto');

const token = {
    permissions: {
        Patient_Search: true
      }
};

(async () => {
    const JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz';
    const appToken = jwt.sign(token, JWT_SECRET);
    const domainPart = "http://localhost:8080";
    
    // Read data from patient data file
    const stream = fs.createReadStream('./syntheadatadump/patients.csv');
    const read = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    // Upload patient data from file
    for await (const line of read) {
        let fileData = line.split(',');

        // Handling skiping first header line
        if (fileData[0] === "Id") {
            continue;
        }

        // Parse file line data to JSON
        let patientJSON = consolidateData(fileData);
        
        // Upload patient data
        await uploadPatient(domainPart, appToken, patientJSON);
    }

})().catch(e => {
    console.dir(e);
});

function createAppointmentJSON(patientInfo) {
    // Set of possible status values
    const statusOptions = ['not_checked_in', 'checked_in', 'complete'];

    // Initialize start time to current date time
    let start = new Date();
    let end = new Date();
    end.setHours(start.getHours() + 1);

    // Return JSON object of appointment data
    return {
        arrivalNotes: "No arrival notes",
        arrived: randomBoolean(),
        patientDataId: patientInfo[0].id,
        name: `${patientInfo[0].firstName} ${patientInfo[0].lastName}`,
        physician: "Dr. Doctor",
        endTime: end,
        startTime: start,
        status: statusOptions[crypto.randomInt(3)],   // Random status pulled from statusOptions array
        type: "consultation",
        notes: "No notes",
        metadata: {}
    };
}

function consolidateData(fileData) {
    // Trim whitespaces in middel of names as it causes fetch errors
    let fName = fileData[7].replace(/\s/g, "");
    let lName = fileData[8].replace(/\s/g, "");

    // Array for random primarylanguage
    const languages = ['English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic'];

    // Randomly assigning primary language
    let primary = languages[crypto.randomInt(5)];

    // Return JSON object of patient data
    return {
        mrn: fileData[0],
        email: fName + lName + "@email.com",
        ssn: fileData[3],
        birthDate: fileData[1],
        address: fileData[16],
        optedoutemail: randomBoolean(),
        gender: fileData[14],
        maritalstatus: randomMarital(),
        primarylanguage: primary,
        languages: randomSecondary(primary),
        phone: randomPhoneNumber(),
        firstname: fName,
        lastname: lName,
        middleinitial: String.fromCharCode(crypto.randomInt(65, 91)),   // Random initial based on ASCII value
        assignedclinician: "Dr. Doctor",
        smsarrived: randomBoolean(),
        smsconfirmed: randomBoolean(),
        smsoptout: randomBoolean(),
        city: fileData[17],
        state: fileData[18],
        postalcode: fileData[20],
        metadata: {}
    };
}

// Function returns a random secondary language that cannot be the same as the primary
function randomSecondary(primary) {
    // Array for secondary languages
    const languages = ['English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic', 'Bengali', 'Russian', 'Portuguese'];
    let secondary = primary;

    // Loop until a different secondary language is chosen
    while (secondary === primary) {
        secondary = languages[crypto.randomInt(8)];
    }
    return secondary;
}

// Function returns a random fake phone number starting with area code 999
function randomPhoneNumber() {
    let number = '999';

    for (let i = 0; i < 7; i++) {
        number = number.concat(crypto.randomInt(10));
    }
    return number;
}
// Function to return random boolean for patient data
function randomBoolean() {
    return crypto.randomInt(0, 2) < 0.5;
}

// Function to return random marital status for patient data
function randomMarital() {
    return (crypto.randomInt(0, 2) < 0.5) ? 'M' : 'S';
}

async function getPatientID(domain, appToken, fileData) {
    let fName = fileData.firstname.replace(/\s/g, "");

    const response = await fetch(`${domain}/api/patient?_content=${fName}`, {
        method: 'GET',
        headers: {
            "Authorization": appToken,
            'Content-Type': 'application/JSON'
        }
    })
    const patientInfo = await response.json();

    // Create appointment object
    let appointmentJSON = createAppointmentJSON(patientInfo);

    // Upload appointment
    return uploadAppointment(domain, appToken, appointmentJSON);
}

async function uploadPatient(domain, appToken, bodydata) {

    await fetch(`${domain}/api/patient`, {
        method: 'POST',
        body: JSON.stringify(bodydata),
        headers: {
            "Authorization": appToken, 
            'Content-Type': 'application/JSON'
        }
    })
    .then(res => {
        if (res.ok) return res;
        throw res;
    })
    .then(response => response.json())
    .then(json => console.log(json))
    .catch((error) => {
        console.log(error);
    });

    // Get patients ID after being uploaded
    return getPatientID(domain, appToken, bodydata);
}

async function uploadAppointment(domain, appToken, bodydata) {

    return fetch(`${domain}/api/appointment`, {
        method: 'POST',
        body: JSON.stringify(bodydata),
        headers: {
            "Authorization": appToken, 
            'Content-Type': 'application/JSON'
        }
    })
    .then(res => {
        if (res.ok) return res;
        throw res;
    })
    .then(response => response.json())
    .then(json => console.log(json))
    .catch((error) => {
        console.log(error);
    });
}
