// Déclarer les variables globales immédiatement
let panier = [];
let total = 0;

// Initialiser Stripe avec la clé publique
const stripe = Stripe('pk_test_51RndxD4FrXK4aJqgKie5XyDJfd03LaB8FygHVJU2qnYSrPQXlESnG6kihjbBsQxTH2AhHQzbLka8AO3EBEKCU15h00PI3DW6Pi');

// Initialiser le panier depuis localStorage
function initialiserPanier() {
    console.log('Initialisation du panier');
    try {
        const storedPanier = localStorage.getItem('panier');
        if (storedPanier) {
            panier = JSON.parse(storedPanier);
            total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);
            console.log('Panier chargé depuis localStorage :', panier);
        } else {
            console.log('Aucun panier trouvé dans localStorage');
        }
    } catch (error) {
        console.error('Erreur lors du chargement du panier depuis localStorage :', error);
        panier = [];
        total = 0;
    }
}

// Mettre à jour le compteur du panier
function mettreAJourCompteur() {
    console.log('Mise à jour du compteur du panier');
    try {
        const cartCounts = document.querySelectorAll('#cart-count');
        cartCounts.forEach(count => {
            count.textContent = panier.length;
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du compteur :', error);
    }
}

// Mettre à jour l’affichage du panier
function mettreAJourPanier() {
    console.log('Mise à jour de l’affichage du panier');
    try {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        if (cartItems && cartTotal) {
            cartItems.innerHTML = '';
            panier.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.nom} - ${item.prix.toFixed(2)} €`;
                cartItems.appendChild(li);
            });
            cartTotal.textContent = total.toFixed(2) + ' €';
        } else {
            console.log('Éléments cart-items ou cart-total non trouvés');
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du panier :', error);
    }
}

// Ajouter un produit au panier
function ajouterAuPanier(nom, prix) {
    console.log('Appel de ajouterAuPanier avec :', { nom, prix });
    try {
        if (!panier) {
            throw new Error('La variable panier n’est pas initialisée');
        }
        if (typeof nom !== 'string' || nom.trim() === '') {
            throw new Error('Nom du produit invalide');
        }
        if (typeof prix !== 'number' || prix <= 0 || isNaN(prix)) {
            throw new Error('Prix du produit invalide');
        }
        panier.push({ nom, prix });
        total += prix;
        localStorage.setItem('panier', JSON.stringify(panier));
        console.log('Panier après ajout :', panier);
        mettreAJourCompteur();
        mettreAJourPanier();
        alert(`${nom} ajouté au panier !`);
    } catch (error) {
        console.error('Erreur dans ajouterAuPanier :', error.message);
        alert('Erreur lors de l’ajout au panier : ' + error.message);
    }
}

// Appliquer une carte cadeau
function appliquerCarteCadeau() {
    console.log('Appel de appliquerCarteCadeau');
    try {
        const code = document.getElementById('gift-code').value.toUpperCase();
        const status = document.getElementById('payment-status');
        if (!code) {
            status.textContent = 'Veuillez entrer un code de carte cadeau.';
            return;
        }
        fetch('http://localhost:3000/valider-carte-cadeau', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        })
        .then(response => {
            console.log('Réponse fetch valider-carte-cadeau :', response.status);
            if (!response.ok) {
                throw new Error(`Erreur HTTP : ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.valid && total >= data.value) {
                total -= data.value;
                status.textContent = `Carte cadeau de ${data.value} € appliquée !`;
                mettreAJourPanier();
                localStorage.setItem('panier', JSON.stringify(panier));
            } else {
                status.textContent = data.valid ? 'Le total est inférieur à la valeur de la carte.' : 'Code invalide.';
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête fetch pour carte cadeau :', error);
            status.textContent = 'Erreur lors de la validation de la carte cadeau : ' + error.message;
        });
    } catch (error) {
        console.error('Erreur dans appliquerCarteCadeau :', error);
    }
}

// Vérifier la disponibilité du serveur
async function verifierServeur() {
    try {
        const response = await fetch('http://localhost:3000/ping', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Réponse ping serveur :', response.status);
        return response.ok;
    } catch (error) {
        console.error('Erreur lors de la vérification du serveur :', error);
        return false;
    }
}

// Payer avec Stripe (carte bancaire ou PayPal)
async function payerAvecStripe() {
    console.log('Appel de payerAvecStripe avec panier :', panier, 'et total :', total);
    try {
        const status = document.getElementById('payment-status');
        if (!status) {
            throw new Error('Élément payment-status non trouvé');
        }
        if (total <= 0) {
            status.textContent = 'Aucun montant à payer.';
            return;
        }
        if (!panier || panier.length === 0) {
            status.textContent = 'Le panier est vide.';
            return;
        }
        const email = prompt('Entrez votre email pour la clé de licence :');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            status.textContent = 'Email invalide.';
            return;
        }

        // Vérifier si le serveur est accessible
        const serveurDisponible = await verifierServeur();
        if (!serveurDisponible) {
            status.textContent = 'Erreur : le serveur de paiement n’est pas accessible.';
            console.error('Le serveur Node.js ne répond pas sur http://localhost:3000');
            return;
        }

        console.log('Envoi de la requête de paiement avec :', { amount: total * 100, currency: 'eur', items: panier, email });
        const response = await fetch('http://localhost:3000/creer-paiement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: Math.round(total * 100),
                currency: 'eur',
                items: panier,
                email: email
            })
        });

        console.log('Réponse fetch creer-paiement :', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erreur HTTP : ${response.status} - ${errorData.error || 'Erreur inconnue'}`);
        }

        const session = await response.json();
        console.log('Session Stripe reçue :', session);
        const result = await stripe.redirectToCheckout({ sessionId: session.id });
        if (result.error) {
            console.error('Erreur Stripe redirectToCheckout :', result.error);
            status.textContent = result.error.message;
        }
    } catch (error) {
        console.error('Erreur dans payerAvecStripe :', error);
        const status = document.getElementById('payment-status');
        if (status) {
            status.textContent = 'Erreur lors du paiement : ' + error.message;
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialisation du DOM');
    try {
        initialiserPanier();
        mettreAJourCompteur();
        mettreAJourPanier();
    } catch (error) {
        console.error('Erreur lors de l’initialisation :', error);
    }
});
