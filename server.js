require('dotenv').config();
const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock'); // Default for development

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, './')));
app.use(express.json());

// API route for Stripe payments (Migrated from Netlify)
app.post('/api/create-payment', async (req, res) => {
    try {
        const { items, customer } = req.body;

        const amount = items.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
        }, 0);

        const amountInCents = Math.round(amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'eur',
            description: `Pedido de ${customer.name}`,
            shipping: {
                name: customer.name,
                address: {
                    line1: customer.address_line1,
                    city: customer.address_city,
                    postal_code: customer.address_zip,
                    country: 'ES'
                }
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error("Payment error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
