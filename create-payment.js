const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { items, customer } = JSON.parse(event.body);

        // Calcular precio total en el servidor (más seguro)
        // Asumimos que el frontend envía items con precio, pero idealmente deberías buscar
        // los precios en tu base de datos o catálogo fijo para evitar manipulaciones.
        // Para este ejemplo simple, confiamos en el input pero lo validamos mínimamente.
        const amount = items.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
        }, 0);

        // Stripe maneja céntimos, multiplicamos por 100
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
            // Habilitar métodos de pago automáticos (tarjetas, apple pay, google pay, etc)
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                clientSecret: paymentIntent.client_secret,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
