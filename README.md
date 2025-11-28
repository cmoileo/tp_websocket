Consignes
Votre application devra permettre une interaction en temps réel entre plusieurs utilisateurs connectés simultanément.

Chaque joueur devra pouvoir :
Se connecter avec un nom et un avatar ;
Être reconnu par les autres joueurs grâce à ces informations.

L’application devra gérer plusieurs types d’interactions :

Des actions ayant un effet visible pour tous les utilisateurs (ex. message global, changement d’état du monde partagé) ;
Des actions ayant un effet visible pour un seul utilisateur (ex. message privé, effet personnel).

Toutes les actions doivent être répercutées en direct grâce à la communication WebSocket

Un utilisateur “admin” devra pouvoir :

Voir la liste des utilisateurs connectés ;
Déconnecter un utilisateur manuellement.

L’application devra :

Maintenir un score global, influencé par les actions des joueurs ;
Rendre ce score visible pour tous ;
Mettre à jour le score en direct à chaque nouvelle action.
