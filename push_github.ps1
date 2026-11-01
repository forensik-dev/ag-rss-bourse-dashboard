# Script PowerShell interactif pour initialiser, vérifier les données sensibles et pousser un projet GitHub
# Usage : .\push_github.ps1

param(
    [string]$RepoName,
    [string]$Username,
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Show-ErrorAndWait {
    param([string]$Message)
    Write-Host "" 
    Write-Host "ERREUR : $Message" -ForegroundColor Red
    Write-Host "" 
    Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Yellow
    [Console]::ReadKey($true) | Out-Null
    exit 1
}

function Test-SensitiveContent {
    param([string]$RootPath)

    $patterns = @(
        'PEA',
        'Investisseur Particulier',
        'Investisseur particulier',
        'Compte de démonstration',
        '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',
        '\b\d{8,}\b',
        'Numéro de compte',
        'Compte bancaire',
        'IBAN',
        'RIB',
        'N° de compte',
        'account.*number',
        'client.*name',
        'prenom|nom',
        'adresse.*mail'
    )

    $hits = @()
    $files = Get-ChildItem -Path $RootPath -File -Recurse | Where-Object {
        $_.Extension -match '\.(js|html|md|txt|json|csv|ps1)$'
    }

    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }

        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                $hits += "- $($file.FullName) (pattern: $pattern)"
                break
            }
        }
    }

    return $hits
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Push GitHub - AG RSS Bourse" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

try {
    if (-not $RepoName) {
        $RepoName = Read-Host "Nom du dépôt GitHub (ex: ag-rss-bourse)"
    }

    if (-not $Username) {
        $Username = Read-Host "Nom d'utilisateur GitHub (ex: forensik-dev)"
    }

    $repoUrl = "https://github.com/$Username/$RepoName.git"

    Write-Host "Vérification des données sensibles avant push..."
    $sensitiveHits = Test-SensitiveContent -RootPath (Get-Location)

    if ($sensitiveHits.Count -gt 0) {
        Write-Host "" 
        Write-Host "Données sensibles détectées :" -ForegroundColor Red
        $sensitiveHits | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        Write-Host "" 
        Write-Host "Supprime ou anonymise ces éléments avant de continuer." -ForegroundColor Yellow
        Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Yellow
        [Console]::ReadKey($true) | Out-Null
        exit 1
    }

    Write-Host "Aucune donnée sensible détectée dans les fichiers texte du projet." -ForegroundColor Green
    Write-Host ""
    Write-Host "Repo cible : $repoUrl"
    Write-Host ""

    if (-not (Test-Path ".git")) {
        Write-Host "Initialisation du dépôt Git..."
        git init
    }

    Write-Host "Ajout des fichiers au dépôt..."
    git add .

    $status = git status --short
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "Aucun changement détecté. Le dépôt est déjà à jour." -ForegroundColor Yellow
    }
    else {
        Write-Host "Création du commit initial..."
        git commit -m "Initial public project commit"
    }

    Write-Host "Configuration de la branche principale..."
    git branch -M $Branch

    Write-Host "Ajout du remote GitHub..."
    try {
        git remote add origin $repoUrl
    }
    catch {
        git remote set-url origin $repoUrl
    }

    Write-Host "Push vers GitHub..."
    git push -u origin $Branch

    Write-Host ""
    Write-Host "SUCCES : Le projet a bien été poussé vers GitHub." -ForegroundColor Green
    Write-Host "URL : $repoUrl"
    Write-Host ""
    Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Yellow
    [Console]::ReadKey($true) | Out-Null
}
catch {
    Show-ErrorAndWait $_.Exception.Message
}
