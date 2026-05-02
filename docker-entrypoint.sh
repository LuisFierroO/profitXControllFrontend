#!/bin/sh
# Genera env.js con la variable de entorno API_URL.
# Si API_URL no está definida, usa http://localhost:8081 como valor por defecto.

API_URL=${API_URL:-http://localhost:8081}

cat > /usr/share/nginx/html/assets/env.js << EOF
(function (window) {
  window.__env = window.__env || {};
  window.__env['API_URL'] = '${API_URL}';
})(this);
EOF

exec "$@"
