# Grabación de estudio

Recursos de clase sobre el equipamiento de nuestros estudios. Se publica con GitHub Pages y está configurado para que los buscadores no lo indexen.

## Estructura

```
index.html              Portada
css/estilos.css         Estilos comunes
microfonia/
  index.html            Catálogo con filtro por tipo y comparativa de sensibilidad
  ficha.html            Ficha de un micrófono (ficha.html?m=<id>)
  datos.js              Datos de todos los micrófonos
  pdf/                  Documentación original de cada fabricante
robots.txt
```

## Añadir un micrófono

1. Copia su PDF en `microfonia/pdf/` con un nombre en minúsculas, sin espacios ni tildes (`marca-modelo.pdf`).
2. Añade un bloque en `MICROFONOS`, dentro de `microfonia/datos.js`, copiando uno parecido:
   - `id`: el mismo estilo que el PDF; es el que aparece en la URL de la ficha.
   - `tipo`: una de las claves de `TIPOS` (`dinamico`, `condensador`, `cinta`, `altavoz`). Si hace falta otra, se añade a `TIPOS` y aparece sola en el filtro.
   - `unidades`: cuántas hay en el estudio.
   - `datos`: pares `["Campo", "Valor"]`. Las tarjetas usan «Patrón polar» y la comparativa usa «Sensibilidad» y «Alimentación», así que conviene mantener esos nombres.
   - `sensDbv`: sensibilidad en dBV/Pa para ordenar la comparativa, o `null` si no hay dato.
   - `notas` y `docs`: listas, pueden ir vacías.
3. Sube los cambios: la web se actualiza en uno o dos minutos.

Los textos describen el micrófono, no para qué instrumento se usa: el catálogo es neutro respecto a la fuente.
