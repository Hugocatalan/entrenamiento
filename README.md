# Hugo Catalán - Landing + Blog (HTML/CSS/JS)

Sitio estático listo para GitHub Pages (o Netlify), con:
- Landing (2 caminos: Atletas / Box)
- CTAs a WhatsApp con mensaje prellenado
- Modo claro/oscuro (respeta preferencia del sistema + guarda en localStorage)
- Blog con historial (lista + paginación) y posts en HTML

## Estructura
- index.html
- /blog/index.html
- /blog/posts/*.html
- /data/posts.json (metadata para listar)
- /assets/css/styles.css
- /assets/js/app.js

## Configurar WhatsApp
El número se define en:
- `<body data-wa-phone="5493425661863">` en cada HTML

Formato: sin `+`, sin espacios.

## Publicar en GitHub Pages
1) Crear repo y subir estos archivos
2) Settings → Pages
3) Source: Deploy from branch
4) Branch: main / root
5) Guardar

## Agregar un post nuevo
1) Copiar `/blog/posts/post-template.html`
2) Completar título / fecha / contenido
3) Guardar con un nombre tipo `/blog/posts/mi-post.html`
4) Agregar un objeto a `/data/posts.json` con `title`, `date` (YYYY-MM-DD), `excerpt`, `tags`, `type` y `url`.

Listo.
