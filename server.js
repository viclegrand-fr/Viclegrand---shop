const express = require('express');
const Stripe = require('stripe')('sk_test_51RndxD4FrXK4aJqg37PocMg9zlnAoavohjZSf2cHZUrxecZPJC6fgOtRpwU3uaVU1PiCPqfwoslluj67lKKwQjM000hHdjvjRI');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('SG.ton_clé_api_sendgrid'); // Remplace par ta clé API SendGrid
const app = express();
app.use(express.json());

// Activer CORS pour les requêtes fetch depuis localhost:8000
const cors = require('cors');
app.use(cors({
    origin: 'http://localhost:8000',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// Route de test pour vérifier la disponibilité du serveur
app.get('/ping', (req, res) => {
    console.log('Requête ping reçue');
    res.json({ status: 'Serveur en ligne' });
});

// Liste de cartes cadeaux (simulée)
const cartesCadeaux = {
    'CADEAU100': 100,
    'CADEAU50': 50,
    'CADEAU25': 25
};

// Valider une carte cadeau
app.post('/valider-carte-cadeau', (req, res) => {
    console.log('Requête valider-carte-cadeau reçue :', req.body);
    const { code } = req.body;
    try {
        if (!code) {
            throw new Error('Code de carte cadeau manquant');
        }
        res.json({ valid: !!cartesCadeaux[code], value: cartesCadeaux[code] || 0 });
    } catch (error) {
        console.error('Erreur dans valider-carte-cadeau :', error);
        res.status(400).json({ error: error.message });
    }
});

// Créer une session de paiement Stripe
app.post('/creer-paiement', async (req, res) => {
    console.log('Requête creer-paiement reçue :', req.body);
    const { amount, currency, items, email } = req.body;
    try {
        if (!amount || amount <= 0) {
            throw new Error('Montant invalide');
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error('Liste des articles invalide');
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Email invalide');
        }
        const session = await Stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal'],
            line_items: items.map(item => {
                if (!item.nom || !item.prix || item.prix <= 0) {
                    throw new Error(`Article invalide : ${JSON.stringify(item)}`);
                }
                return {
                    price_data: {
                        currency: currency,
                        product_data: { name: item.nom },
                        unit_amount: Math.round(item.prix * 100)
                    },
                    quantity: 1
                };
            }),
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
        console.log('Email envoyé avec la clé de licence :', session.metadata.license_key);

        res.json({ id: session.id });
    } catch (error) {
        console.error('Erreur dans creer-paiement :', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Serveur démarré sur le port 3000'));
