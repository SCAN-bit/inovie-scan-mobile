# 📋 LOGIQUE MÉTIER - Rescan de colis

## 🎯 Règle métier

**Principe** : Un colis ne peut être rescanné que s'il a été déposé (livré).

## 🔄 États d'un colis

### 1. **Non scanné** (État initial)
- ✅ **Peut être scanné** : Premier scan autorisé
- ❌ **Ne peut pas être rescanné** : Pas encore scanné

### 2. **En cours de prise en charge** (État intermédiaire)
- ❌ **Ne peut pas être rescanné** : Déjà en prise en charge
- ✅ **Doit être déposé** : Pour pouvoir être rescanné

### 3. **Déposé/Livré** (État final)
- ✅ **Peut être rescanné** : Colis libéré pour un nouveau cycle

## 🛡️ Protections implémentées

### 1. Protection "Déjà scanné dans cette session"
```javascript
const alreadyScanned = scannedContenants.some(contenant => 
  (contenant.idColis || contenant.code) === trimmedCode
);

if (alreadyScanned) {
  showToast(`Colis "${trimmedCode}" déjà scanné dans cette session.`, 'warning');
  return;
}
```

**Objectif** : Empêcher de scanner plusieurs fois le même colis dans la même session de scan.

### 2. Protection "Déjà en prise en charge"
```javascript
const isInTakingCare = takingCarePackages.some(pkg => (pkg.idColis || pkg.code) === trimmedCode);
if (isInTakingCare) {
  showToast(`Colis "${trimmedCode}" déjà en prise en charge. Déposez-le d'abord.`, 'warning');
  return;
}
```

**Objectif** : Empêcher de rescanner un colis qui est encore en cours de prise en charge.

## 🔄 Cycle de vie d'un colis

```
1. [NON SCANNÉ] 
   ↓ (premier scan)
2. [EN COURS DE PRISE EN CHARGE] 
   ↓ (dépôt/transmission)
3. [DÉPOSÉ/LIVRÉ] 
   ↓ (peut être rescanné)
4. [NOUVEAU CYCLE] → Retour à l'état 1
```

## ✅ Cas autorisés

### ✅ Rescan autorisé
- Colis déposé/livré (statut = 'livré')
- Colis non scanné (premier scan)
- Colis d'une session précédente (si déposé)

### ❌ Rescan interdit
- Colis en cours de prise en charge (statut = 'en-cours')
- Colis déjà scanné dans la session courante
- Colis en attente de transmission

## 🧪 Tests de validation

### Test 1: Premier scan
1. Scanner un colis non scanné (ex: BT01)
2. **RÉSULTAT ATTENDU** : ✅ Scan autorisé, colis ajouté à la liste

### Test 2: Rescan interdit (en cours)
1. Scanner un colis déjà en prise en charge
2. **RÉSULTAT ATTENDU** : ❌ Message "déjà en prise en charge"

### Test 3: Rescan autorisé (déposé)
1. Déposer un colis (transmettre)
2. Scanner à nouveau le même colis
3. **RÉSULTAT ATTENDU** : ✅ Scan autorisé (nouveau cycle)

### Test 4: Double scan dans la session
1. Scanner un colis
2. Scanner le même colis sans le déposer
3. **RÉSULTAT ATTENDU** : ❌ Message "déjà scanné dans cette session"

## 📝 Messages utilisateur

### Messages d'erreur
- `"Colis "BT01" déjà scanné dans cette session."`
- `"Colis "BT01" déjà en prise en charge. Déposez-le d'abord."`

### Messages de succès
- `"Colis "BT01" scanné avec succès"` (premier scan)
- `"Colis "BT01" scanné avec succès"` (rescan après dépôt)

## 🔧 Implémentation technique

### Vérifications dans l'ordre
1. **Validation du code** : Format et longueur
2. **Déjà scanné dans la session** : `scannedContenants`
3. **En cours de prise en charge** : `takingCarePackages`
4. **Détection du type d'opération** : Entrée ou sortie
5. **Ajout à la liste** : Si toutes les vérifications passent

### Sources de données
- **Session courante** : `scannedContenants` (colis de la session)
- **Prise en charge** : `takingCarePackages` (colis en cours)
- **Historique** : `historicalScans` (colis des sessions précédentes)

---

**Date de création** : $(date)  
**Version** : 1.0.8  
**Statut** : ✅ Implémenté et testé
