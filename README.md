# PedidosYa Scraper API

This project utilizes web scraping techniques to collect information from the online food delivery service, PedidosYa. The scraping process is automated using the Playwright library for specific locations. The collected information is then used to create an API using Cloudflare Workers and Hono. 

## Data Storage
The data is stored in JSON files and images are optimized using the Sharp library. These files are periodically uploaded to a MongoDB database for backup.

## API Usage
The API can be used to access the information collected from PedidosYa in a structured and easily consumable format.

### Endpoints
 - /products
 - /markets
 - /categories

## Screenshots

Raw data of products:
![image of raw data from the API](/screenshots/products.png)

Raw data of categories:
![image of raw data from the API](/screenshots/categories.png)

## Setting up the project
To use this project, you need to have installed NodeJS and MongoDB.
Once you have cloned the repository, run `npm install` to install the dependencies.

## Running the project
To start the scraping process, run `npm run scrap`.
To run the API locally, run `npm run dev:api`
To publish the API, run `npm run publish:api`

You have to configure a env file using the example.env.

## Built With
- Playwright
- Cloudflare Workers
- Hono
- Sharp
- MongoDB
- Node.js

## License
This project is licensed under the ISC License - see the [LICENSE.md](LICENSE.md) file for details.

## Disclaimer
This project is for educational use only and should not be used for any commercial purposes without obtaining proper authorization from PedidosYa.
