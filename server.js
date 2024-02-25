require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get("/", (req, res) => {
  try {
    connection.query("SELECT * FROM contacts", (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send("Internal Server Error");
            return;
        }
        console.log("Query results:", results);
        res.send(results);
    });
  } catch (error) {
    console.error("Error deleting contacts:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/identify", async (req, res) => {
    try {
        const { phoneNumber, email } = req.body;

        const [contacts] = await connection.promise().query(
            "SELECT * FROM contacts WHERE email = ? OR phoneNumber = ?",
            [email, phoneNumber]
        );

        const uniqueEmails = [];
        const uniquePhoneNumbers = [];
        const secondaryContactIds = [];

        contacts.forEach((contact) => {
            if (contact.linkPrecedence === "primary") {
                if (!uniqueEmails.includes(contact.email)) {
                    uniqueEmails.push(contact.email);
                }
                if (!uniquePhoneNumbers.includes(contact.phoneNumber)) {
                    uniquePhoneNumbers.push(contact.phoneNumber);
                }
            } else if (contact.linkPrecedence === "secondary") {
                secondaryContactIds.push(contact.id);
            }
        });

        if (
            !uniqueEmails.includes(email) ||
            !uniquePhoneNumbers.includes(phoneNumber)
        ) {
            const [result] = await connection.promise().query(
                "INSERT INTO contacts (phoneNumber, email, linkPrecedence) VALUES (?, ?, ?)",
                [phoneNumber, email, "primary"]
            );
            const newContactId = result.insertId;
            if (!uniqueEmails.includes(email)) {
                uniqueEmails.push(email);
            }
            if (!uniquePhoneNumbers.includes(phoneNumber)) {
                uniquePhoneNumbers.push(phoneNumber);
            }
            if (contacts.length > 0) {
                await Promise.all(
                    contacts.map(async (contact) => {
                        if (contact.linkPrecedence === "primary") {
                            await connection.promise().query(
                                "INSERT INTO contacts (phoneNumber, email, linkedId, linkPrecedence) VALUES (?, ?, ?, ?)",
                                [phoneNumber, email, newContactId, "secondary"]
                            );
                            secondaryContactIds.push(newContactId);
                        }
                    })
                );
            }
        }

        const primaryContact = contacts.find(
            (contact) => contact.linkPrecedence === "primary"
        );
        const response = {
            contact: {
                primaryContactId: primaryContact ? primaryContact.id : null,
                emails: [...new Set(uniqueEmails)],
                phoneNumbers: [...new Set(uniquePhoneNumbers)],
                secondaryContactIds: secondaryContactIds.filter(
                    (id) => id !== (primaryContact ? primaryContact.id : null)
                ),
            },
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error identifying contact:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.delete("/contacts", async (req, res) => {
    try {
        await connection.promise().query("DELETE FROM contacts");

        res.status(200).send("All contacts deleted successfully");
    } catch (error) {
        console.error("Error deleting contacts:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
