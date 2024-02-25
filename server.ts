require("dotenv").config();
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import connection from "./db";
import { RowDataPacket, OkPacket } from "mysql2";
const app = express();
const port = process.env.PORT || 3000;

interface ContactResponse {
  contact: {
    primaryContactId: number | null;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}
app.use(bodyParser.json());
app.get("/", (req: Request, res: Response) => {
  connection.query("SELECT * FROM contacts", (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    console.log("Query results:", results);
    res.send(results);
  });
});
app.post("/identify", async (req: Request, res: Response) => {
  try {
    const { phoneNumber, email } = req.body;

    const [contacts] = await connection
      .promise()
      .query<RowDataPacket[]>(
        "SELECT * FROM contacts WHERE email = ? OR phoneNumber = ?",
        [email, phoneNumber]
      );

    const uniqueEmails: string[] = [];
    const uniquePhoneNumbers: string[] = [];
    const secondaryContactIds: number[] = [];

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
      const [result] = await connection
        .promise()
        .query(
          "INSERT INTO contacts (phoneNumber, email, linkPrecedence) VALUES (?, ?, ?)",
          [phoneNumber, email, "primary"]
        );
      const newContactId = (result as OkPacket).insertId;
      if (!uniqueEmails.includes(email)) {
        uniqueEmails.push(email);
      }
      if (!uniquePhoneNumbers.includes(phoneNumber)) {
        uniquePhoneNumbers.push(phoneNumber);
      }
      if (contacts.length > 0) {
        await Promise.all(
          contacts.map(async (contact: RowDataPacket) => {
            if (contact.linkPrecedence === "primary") {
              await connection
                .promise()
                .query(
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
    const response: ContactResponse = {
      contact: {
        primaryContactId: primaryContact ? primaryContact.id : null,
        emails: [...new Set(uniqueEmails)],
        phoneNumbers: [...new Set(uniquePhoneNumbers)],
        secondaryContactIds: secondaryContactIds.filter(
          (id) => id !== (primaryContact?.id || null)
        ),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error identifying contact:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.delete("/contacts", async (req: Request, res: Response) => {
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
