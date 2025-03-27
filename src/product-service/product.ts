import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';

import { createClient } from 'redis';
import { Product, ServiceResponse } from '../types'

config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());


// make a redis client
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

// Handle Redis connection errors
redisClient.on('error', (err) => {
    console.error('redis client error', err);
    process.exit(1);
});

// Attempt to connect to Redis, but don't block startup on failure
redisClient.connect().catch(() => {
    console.log('redis connection failed');
    process.exit(1);
});



// An implied example of 'products' by definition
const products: Product[] = [
    {
        id: 1,
        name: 'Laptop',
        description: 'a very powerful laptop',
        price: 999.99,
        stock: 10,
    },
    {
        id: 2,
        name: 'Headphones',
        description: 'a very loud bass-thumping blood-pumping headphone',
        price: 199.99,
        stock: 6,
    },
];

const cacheTimeoutString: string | undefined = process.env.CACHE_TIMEOUT;
if(!cacheTimeoutString) process.exit(1);
const cacheTimeout: number = parseInt(cacheTimeoutString, 10);

async function updateRedisCache() {
    try {
        await redisClient.set('products', JSON.stringify(products), {
            EX: cacheTimeout,
        });
        console.log('Redis cache updated successfully');

        setTimeout(() => {
            console.log('Cache expired');
        }, cacheTimeout * 1000);

    } catch (updateRedisError) {
        console.error('Error updating Redis cache:', updateRedisError);
        throw updateRedisError;
    }
}

try {
    updateRedisCache();
} catch (overallError) {
    console.error('An overall error occurred:', overallError);
}

app.get('/products', async (req, res) => {
    try {
        const cachedProducts = await redisClient.get('products');
        if(cachedProducts) {
            res.json({
                success: true,
                data: JSON.parse(cachedProducts)
            });
            return;
        }

        else {
            console.error('no products in cache');
            res.status(404).json({
                success: false,
                error: 'no products found in the cache'
            })
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: `failed to fetch products - error : ${error}`
        });
    }
});


app.get('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const cachedProducts = await redisClient.get(`product:${id}`);
        if(cachedProducts) {
            res.json({
                success: true,
                data: JSON.parse(cachedProducts)
            });
            return;
        }

        // searching in the predifened array -- in javascript
        const product = products.find((p) => p.id === parseInt(id, 10))
    
        // id is not in the products
        if(!product) {
            res.status(404).json({
                success: false,
                error: `product with id ${id} not found`
            });
            return;
        }

        // the id exists (true) --> add to cache
        await redisClient.set(`product:${id}`, JSON.stringify(product), {
            EX: cacheTimeout
        });

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        
        res.status(500).json({
            success: false,
            error: `failed to fetch the product with id ${req.params.id} - error : ${error}`
        });
    }
});


app.post('/products/add/', async (req,res) => {

    try {
        
        const { productName, productDes, productPrice } = req.body;
        console.log( productName, productDes, productPrice );
        

        res.json({
            success: true,
            data: 'this should be changed to the new product ID'
        })


    } catch (error) {
        res.status(500).json({
            success: false,
            error: `failed to add productID:${req.params}`
        })
    }

})



const port = process.env.PRODUCT_SERVICE_PORT || 3001;
app.listen(port, () => {
    console.log(`product service listening on port ${port}`);
    
})