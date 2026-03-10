# Guía de Despliegue e Indexación en Google

Esta guía te llevará paso a paso para publicar tu web en internet GRATIS y avisar a Google para que empiece a mostrarla en los resultados.

## Parte 1: Publicar la web (Hosting en Netlify)

1.  **Crea una cuenta**: Ve a [netlify.com](https://www.netlify.com/) y regístrate (puedes usar tu correo).
2.  **Prepara tu carpeta**: Asegúrate de tener localizada la carpeta `fruteria-nexus` en tu Escritorio.
3.  **Arrastrar y Soltar**: 
    - Una vez dentro de Netlify, verás un área que dice *"Drag and drop your site output folder here"*.
    - Arrastra tu carpeta `fruteria-nexus` ahí.
4.  **¡Listo!**: En unos segundos, Netlify te dará un enlace verde (ej. `https://happy-apple-123456.netlify.app`). Ese es tu sitio web en vivo.
    - *Opcional*: Puedes cambiar el nombre en "Site Settings -> Change site name" para algo como `fruteria-nexus-demo.netlify.app`.

## Parte 2: Avisar a Google (Search Console)

1.  **Entra en GSC**: Ve a [Google Search Console](https://search.google.com/search-console) e inicia sesión con tu cuenta de Google.
2.  **Añadir Propiedad**:
    - Selecciona el tipo **"Prefijo de URL"** (URL Prefix).
    - Pega la dirección de tu nueva web (la de Netlify, ej. `https://fruteria-nexus-demo.netlify.app`).
    - Dale a "Continuar".
3.  **Verificar Propiedad**: Google te pedirá comprobar que la web es tuya. 
    - **Método Recomendado (Archivo HTML)**:
        1. Descarga el archivo que te dan (ej. `google12345.html`).
        2. Mueve ese archivo dentro de tu carpeta `fruteria-nexus` en el Escritorio.
        3. Vuelve a Netlify y **arrastra la carpeta de nuevo** para actualizar la web.
        4. Vuelve a Search Console y dale a **"Verificar"**.
4.  **Enviar Sitemap**:
    - En el menú de la izquierda, ve a **Sitemaps**.
    - Escribe `sitemap.xml` en la casilla "Añadir un sitemap nuevo".
    - Dale a "Enviar".

## Parte 3: Ajuste Final (Importante)

Una vez tengas tu URL definitiva (ej. `https://fruteria-nexus-demo.netlify.app`), debemos actualizar un pequeño archivo para que sea perfecto:

1.  Abre el archivo `robots.txt` en tu carpeta.
2.  Cambia la última línea para que coincida con tu nueva URL real:
    ```txt
    Sitemap: https://TU-NUEVA-URL-DE-NETLIFY/sitemap.xml
    ```
3.  Guarda y vuelve a subir la carpeta a Netlify una última vez.

¡Felicidades! 🎉 Tu web ya es pública y Google empezará a leerla en las próximas horas/días.
