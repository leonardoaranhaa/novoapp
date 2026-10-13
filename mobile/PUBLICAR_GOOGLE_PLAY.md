# Latente no Google Play

O app Android é o mesmo `LatenteApp` da versão web, empacotado com Capacitor 8
num bundle estático (`mobile/` → `dist-mobile/` → `android/`). Funciona offline:
fontes locais, nenhum servidor, dados só no aparelho (`localStorage` do WebView).

## APK de teste (sem instalar nada)

A cada push que mexe no app, o GitHub Actions (`.github/workflows/android-apk.yml`)
gera um APK de debug e o publica na pré-release `apk-teste`:

https://github.com/leonardoaranhaa/novoapp/releases/download/apk-teste/latente-teste.apk

No Android, abra o link, baixe e toque no arquivo. Na primeira vez, o sistema pede
para permitir "instalar apps desconhecidos" no navegador. Se uma versão anterior
estiver instalada, a nova instala por cima e mantém as películas salvas.

## Pré-requisitos

- Node 22+, JDK 21, Android SDK com `platforms;android-36` e `build-tools;36.0.0`
  (o Android Studio instala tudo isso).
- `android/local.properties` com `sdk.dir=/caminho/do/Android/Sdk` (não vai pro git).

## Comandos

| Comando | O que faz |
|---|---|
| `npm run mobile:build` | Gera o bundle estático em `dist-mobile/` |
| `npm run mobile:preview` | Serve esse bundle em `127.0.0.1:8082` para testar no navegador |
| `npm run android:sync` | Bundle + copia para o projeto Android |
| `npm run android:apk` | APK de teste: `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run android:bundle` | AAB de publicação: `android/app/build/outputs/bundle/release/app-release.aab` |
| `node mobile/generate-android-assets.mjs` | Regera ícones, splash e artes da loja a partir de `public/favicon.svg` e `public/og.jpg` |

Depois de qualquer mudança em `src/`, rode `npm run android:sync` (ou os comandos de build acima).

## 1. Chave de upload (uma vez só)

```bash
keytool -genkeypair -v -keystore latente-upload.jks -alias latente \
  -keyalg RSA -keysize 2048 -validity 10000
```

Guarde o `.jks` e as senhas num gerenciador de senhas. **Nunca** commite o arquivo
(`*.jks`, `*.keystore` e `keystore.properties` estão no `.gitignore`).

Crie `android/keystore.properties`:

```properties
storeFile=/caminho/absoluto/latente-upload.jks
storePassword=...
keyAlias=latente
keyPassword=...
```

Sem esse arquivo o `bundleRelease` gera um AAB **não assinado**, que o Play recusa.

## 2. Versão

Em `android/app/build.gradle`, a cada envio: `versionCode` +1 (inteiro, obrigatório)
e `versionName` legível (ex.: `"1.0.1"`).

## 3. Play Console

1. Criar o app: nome **Latente**, idioma pt-BR, tipo *Jogo* ou *App*, gratuito.
2. Ativar o **Play App Signing** (padrão). O Google guarda a chave de assinatura; a
   sua chave do passo 1 é só a de upload.
3. **Ficha da loja**, com as artes prontas em `mobile/store/`:
   - Ícone 512×512: `icon-512.png`
   - Gráfico de recursos 1024×500: `feature-graphic-1024x500.png`
   - Capturas de tela de celular (mín. 2): tire no aparelho ou emulador.
4. **Conteúdo do app**:
   - *Segurança dos dados*: o app não coleta nem compartilha dados; as películas
     ficam só no aparelho.
   - *Classificação de conteúdo*: preencher o questionário.
   - *Público-alvo*, *Anúncios* (não contém) e URL da *Política de privacidade*.
5. **Teste**: contas pessoais novas precisam de um teste fechado (hoje, 12 testadores
   por 14 dias) antes de liberar a produção. Confirme a regra atual no Console.
6. Enviar o `app-release.aab` numa versão e mandar para revisão.

## Notas técnicas

- `appId` `com.latente.app` (em `capacitor.config.ts` e `android/app/build.gradle`)
  **não pode mudar** depois do primeiro envio. Troque antes, se quiser outro.
- A tela fica travada em retrato porque o banho usa a inclinação do aparelho.
- O áudio pausa quando o app vai para segundo plano (`visibilitychange` no motor).
