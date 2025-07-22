const express = require('express');
const Stripe = require('stripe')('sk_test_51RndxD4FrXK4aJqg37PocMg9zlnAoavohjZSf2cHZUrxecZPJC6fgOtRpwU3uaVU1PiCPqfwoslluj67lKKwQjM000hHdjvjRI');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('SG.ton_clé_api_sendgrid'); // Remplace par ta clé API SendGrid
const app = express();
app.use(express.json());

// Liste de cartes cadeaux (simulée)
const cartesCadeaux = {
    'CADEAU100': 100,
    'CADEAU50': 50,
    'CADEAU25': 25
};

// Valider une carte cadeau
app.post('/valider-carte-cadeau', (req, res) => {
    const { code } = req.body;
    res.json({ valid: !!cartesCadeaux[code], value: cartesCadeaux[code] || 0 });
});

// Créer une session de paiement Stripe
app.post('/creer-paiement', async (req, res) => {
    const { amount, currency, items, email } = req.body;
    try {
        const session = await Stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal'],
            line_items: items.map(item => ({
                price_data: {
                    currency: currency,
                    product_data: { name: item.nom },
                    unit_amount: Math.round(item.prix * 100)
                },
                quantity: 1
            })),
            mode: 'payment',
            success_url: 'http://localhost:8000/panier.html?success=true',
            cancel_url: 'http://localhost:8000/panier.html?cancel=true',
            customer_email: email,
            metadata: {
                license_key: `LIC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
            }
        });

        // Envoyer l'email avec la clé de licence
        const msg = {
            to: email,
            from: 'ton_email@domaine.com', // Remplace par ton email vérifié SendGrid
            subject: 'Votre clé de licence',
            text: `Merci pour votre achat ! Votre clé de licence est : ${session.metadata.license_key}`,
            html: `<p>Merci pour votre achat ! Votre clé de licence est : <strong>${session.metadata.license_key}</strong></p>`
        };
        await sgMail.send(msg);

        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Serveur démarré sur le port 3000'));