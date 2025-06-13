# Utiliser l'image officielle Node.js 18 
FROM node:18-slim

# Installer OpenJDK 17 et les outils nécessaires
RUN apt-get update && apt-get install -y openjdk-17-jdk curl unzip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Configurer les variables d'environnement Java
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Définir les variables d'environnement pour Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/build-tools/34.0.0

# Créer le répertoire pour Android SDK
RUN mkdir -p ${ANDROID_HOME}

# Télécharger et installer Android SDK command line tools
RUN curl -o sdk-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
    unzip sdk-tools.zip -d ${ANDROID_HOME} && \
    mv ${ANDROID_HOME}/cmdline-tools ${ANDROID_HOME}/cmdline-tools-temp && \
    mkdir -p ${ANDROID_HOME}/cmdline-tools/latest && \
    mv ${ANDROID_HOME}/cmdline-tools-temp/* ${ANDROID_HOME}/cmdline-tools/latest/ && \
    rm -rf sdk-tools.zip ${ANDROID_HOME}/cmdline-tools-temp

# Accepter les licences et installer les plateformes Android
RUN yes | ${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager --licenses && \
    ${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Définir le répertoire de travail
WORKDIR /app/inovie-scan-mobile

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances Node.js avec npm ci pour des builds reproductibles
RUN npm ci

# Copier tout le reste du projet
COPY . .

# Variables d'environnement Java pour optimiser les builds
ENV JAVA_OPTS="-Xmx4g -XX:MaxMetaspaceSize=1g"
ENV GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx4g -Dorg.gradle.daemon=false"

# Aller dans le dossier Android et construire l'APK
WORKDIR /app/inovie-scan-mobile/android

# Construire l'APK de release avec des options Gradle appropriées
RUN ./gradlew assembleRelease --stacktrace --info --no-daemon

# Exposer les ports si nécessaire (pour un serveur de développement, non critique pour le build d'APK)
EXPOSE 19000 19001

# Commande par défaut (optionnelle, pour copier l'APK)
CMD ["cp", "app/build/outputs/apk/release/app-release.apk", "/app/"]