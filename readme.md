# BiteSpeed Backend Task

This project is a backend application built using Node.js and MySQL database. It provides functionalities for managing contacts including retrieving, identifying, and deleting contacts.

## Installation

Clone the repository and Hosted project URL are the following command:

```bash
git clone https://github.com/abhms/bitespeed-backend.git

project URL: https://bitespeed-backend-gqqh.onrender.com
```

## Create .env file with below details

```bash 
HOST= 
DATABASE=
USER=
PASSWORD= 
PORT= 
```
## Run project
 
To run project

```bash
  npm install
  npm start
```

# For getting all data endpoint is

```bash
method GET: https://bitespeed-backend-gqqh.onrender.com/getall
```

# For uploading all data endpoint is

```bash
method POST : https://bitespeed-backend-gqqh.onrender.com/identify

Send this in body in JSON formate

{
    "phoneNumber": "",
    "email": ""
}
```

# For deleting all data from database

```bash
method DELETE : https://bitespeed-backend-gqqh.onrender.com/delete
```