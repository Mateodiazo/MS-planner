# ---- MS Planner · servidor estático con Nginx (no-root, read-only) ----
# Se usa la imagen "unprivileged" de nginx: corre como usuario nginx (uid 101),
# escucha en 8080 y NO necesita root. Esto satisface el requisito de no-root
# del spec de forma real (la imagen nginx:alpine normal arranca su master como
# root). Si prefieres la imagen estándar, cámbiala y añade `user nginx;` al conf.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# La app modular (generada por la Tarea 1). Estos COPY requieren que exista la
# estructura css/ y js/ tras el refactor; hasta entonces el build fallará a
# propósito (recordatorio de que Docker va DESPUÉS del refactor).
COPY index.html /usr/share/nginx/html/
COPY css/       /usr/share/nginx/html/css/
COPY js/        /usr/share/nginx/html/js/
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Healthcheck (la imagen unprivileged sirve en 8080)
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
