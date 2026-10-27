# Grabación de estudio

Recursos de clase sobre el equipamiento de nuestros estudios. Se publica con GitHub Pages y está configurado para que los buscadores no lo indexen.

## Estructura

```
index.html              Portada
css/marxadella.css      Estilos con la identidad visual del IES La Marxadella
fuentes/                Tipografía Silka (woff2)
img/                    Logo y favicon del centro
microfonia/
  index.html            Menú de modelos a la izquierda y ficha a la derecha (index.html#<id>)
  ficha.html            Redirección de los enlaces antiguos (ficha.html?m=<id>)
  datos.js              Datos de todos los micrófonos
  img/                  Foto de cada modelo
  pdf/                  Documentación original de cada fabricante
robots.txt
```

## Añadir un micrófono

1. Copia su PDF en `microfonia/pdf/` y su foto en `microfonia/img/`, con nombres en minúsculas, sin espacios ni tildes (`marca-modelo.pdf`, `marca-modelo.png`). La foto queda mejor recortada sobre fondo blanco o transparente: se muestra sobre una placa clara.
2. Añade un bloque en `MICROFONOS`, dentro de `microfonia/datos.js`, copiando uno parecido:
   - `id`: el mismo estilo que el PDF; es el que aparece en la URL de la ficha.
   - `tipo`: una de las claves de `TIPOS` (`dinamico`, `condensador`, `cinta`, `altavoz`). Si hace falta otra, se añade a `TIPOS` en `datos.js` y a `GRUPOS` en `microfonia/index.html` (el nombre del grupo en el menú).
   - `img`: ruta de la foto (`img/marca-modelo.png`).
   - `datos`: pares `["Campo", "Valor"]`. La comparativa usa «Sensibilidad» y «Alimentación», así que conviene mantener esos nombres.
   - `sensDbv`: sensibilidad en dBV/Pa para ordenar la comparativa, o `null` si no hay dato.
   - `notas` y `docs`: listas, pueden ir vacías.
3. Sube los cambios: la web se actualiza en uno o dos minutos.

Si cambias `datos.js`, `polar.js` o `css/marxadella.css`, sube el número `?v=` con el que se enlazan en los `index.html`. GitHub Pages deja que el navegador guarde cada archivo 10 minutos; con el número nuevo, quien cargue la página nueva recibe también sus archivos nuevos.

Los textos describen el micrófono, no para qué instrumento se usa: el catálogo es neutro respecto a la fuente.
