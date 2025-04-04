import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { createProxyMiddleware } from 'http-proxy-middleware';

import { config } from 'dotenv';
config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());



const productServiceProxy = createProxyMiddleware({
    target: `http://${process.env.PRODUCT_SERVICE_HOST || 'localhost'}:${process.env.PRODUCT_SERVICE_PORT || 3001}`,
    logger: console,
    changeOrigin: true,
    pathRewrite: { '^/api/products': '/products' },
});


const orderServiceProxy = createProxyMiddleware({
    target: `http://${process.env.ORDER_SERVICE_HOST || 'localhost'}:${process.env.ORDER_SERVICE_PORT || 3002}`,
    logger: console,
    changeOrigin: true,
    pathRewrite: { '^/api/orders': '/orders' },
});


const userServiceProxy = createProxyMiddleware({
    target: `http://${process.env.USER_SERVICE_HOST || 'localhost'}:${process.env.USER_SERVICE_PORT || 3003}`,
    logger: console,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '/users' },
})


// routes
app.use('/api/products', productServiceProxy);
app.use('/api/orders', orderServiceProxy);
app.use('/api/users', userServiceProxy);


app.get('/health', (req,res)=>{
    res.json({
        status: 'healthy',
        timeStamp: new Date().toISOString()
    })
})


const port = process.env.GATEWAY_PORT || 3000;
app.listen(port, ()=>{
    console.log(`gateway listening at port ${port}`);
})