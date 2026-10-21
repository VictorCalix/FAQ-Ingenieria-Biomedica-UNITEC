# Documentos del repositorio

Coloca aqui los PDFs de manuales y guias rapidas.

Los manuales viven en `manuales/`. Las guias rapidas viven en `guias-rapidas/<equipo>/`, una carpeta por equipo.

El sitio detecta las guias rapidas por nombre usando este formato:

```text
<nombre-del-equipo-normalizado>-manual.pdf
<nombre-del-equipo-normalizado>-guia-rapida.pdf
```

Reglas de normalizacion:

- todo en minusculas;
- sin tildes;
- espacios y simbolos convertidos a guiones;
- sin guiones al inicio o al final.

Ejemplo para `Analizador de Desfibrilador - DA-2006P`:

```text
analizador-de-desfibrilador-da-2006p-manual.pdf
analizador-de-desfibrilador-da-2006p-guia-rapida.pdf
```

Para un QR de ese equipo usa:

```text
/?equipo=analizador-de-desfibrilador-da-2006p
```

## Cómo subir manuales y guías rápidas con GitHub Desktop

### 1. Entender qué vas a hacer

GitHub guarda una copia del proyecto en internet. GitHub Desktop permite descargar esa copia a tu computadora y enviar los cambios desde una aplicación.

| Término o botón | Qué significa |
| --- | --- |

| Repositorio | La carpeta del proyecto, con sus archivos y su historial de cambios. |
| Clone | Descargar una copia del repositorio a tu computadora. Se hace una vez. |
| Rama o branch | Una línea de trabajo del proyecto. La principal de este repositorio se llama `main`. |
| Fetch origin / Pull origin | Consultar y descargar los cambios que otras personas hayan subido. |
| Commit | Guardar un conjunto de cambios en el historial de tu computadora, con una descripción. |
| Push origin | Enviar los commits de tu computadora a GitHub. |

El recorrido será: **actualizar tu copia → colocar los PDF → actualizar el catálogo → hacer commit → hacer push → verificar**.

### 2. Preparar lo necesario (solo la primera vez)

1. Crea una cuenta en [GitHub](https://github.com/) si todavía no tienes una.
2. Pide al administrador del proyecto que te agregue como colaborador con permiso de escritura y acepta la invitación. Poder ver o descargar el repositorio no significa que puedas subir cambios.
3. Descarga e instala [GitHub Desktop](https://desktop.github.com/).
4. Abre GitHub Desktop, selecciona **Sign in to GitHub.com** e inicia sesión en el navegador. Autoriza el acceso y vuelve a la aplicación cuando te lo indique.
5. Si te pide configurar Git, introduce tu nombre y un correo asociado a tu cuenta. Estos datos identificarán tus cambios.
6. Instala [Node.js](https://nodejs.org/) en una versión compatible con el proyecto: **22.13.0 o superior**. Se necesita para actualizar el catálogo de documentos en el paso 6. Después de instalarlo, cierra y vuelve a abrir las terminales que tengas abiertas.

### 3. Descargar el proyecto a tu computadora (solo la primera vez)

1. En GitHub Desktop, abre **File → Clone repository...**.
2. Selecciona la pestaña **URL** y pega esta dirección:

   ```text
   https://github.com/VictorCalix/FAQ-Ingenieria-Biomedica-UNITEC.git
   ```

3. En **Local path**, elige dónde guardar el proyecto. Recuerda esta ubicación.
4. Haz clic en **Clone** y espera a que termine.

Si ya tienes una copia clonada, selecciónala en **Current Repository**. Si esa copia todavía no aparece en GitHub Desktop, usa **File → Add local repository...** y elige la carpeta del proyecto que contiene `.git`.

La opción **Download ZIP** de la página de GitHub no crea una copia conectada para este procedimiento; usa **Clone**.

Referencia: [clonar un repositorio con GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop).

### 4. Actualizar tu copia antes de agregar archivos (cada vez)

1. Comprueba que **Current Repository** muestre `FAQ-Ingenieria-Biomedica-UNITEC`.
2. En **Current Branch**, selecciona `main` si tienes permitido trabajar directamente en esa rama. Si el proyecto requiere revisión, sigue el apartado de ramas al final de esta guía antes de continuar.
3. Haz clic en **Fetch origin**. Si después aparece **Pull origin**, haz clic también y espera a que termine.
4. Abre **Repository → Show in Explorer** para abrir la carpeta correcta del proyecto.

Si aparecen cambios locales de un trabajo anterior en **Changes**, revísalos antes de continuar para no mezclarlos con la nueva carga.

### 5. Preparar y copiar los documentos

#### Elegir el nombre correcto

Usa el nombre completo del equipo, incluido su modelo, tal como está en el selector de equipos de la página. Aplica las reglas de normalización del inicio de este README. Para `Analizador de Desfibrilador - DA-2006P`, la parte común del nombre es:

```text
analizador-de-desfibrilador-da-2006p
```

En Windows, activa **Ver → Mostrar → Extensiones de nombre de archivo** en el Explorador; en algunas versiones aparece como una casilla en **Vista**. Así podrás comprobar que el archivo termine en `.pdf` y evitar nombres como `.pdf.pdf`.

#### Subir una guía rápida

1. Exporta o descarga la guía como **PDF** desde el programa donde la elaboraste. Cambiar la extensión de un Word o un `.tex` a `.pdf` no lo convierte en PDF.
2. Abre el PDF y comprueba que corresponde al equipo y que sus páginas se leen correctamente.
3. Dentro del proyecto, entra en `assets → documentos → guias-rapidas`.
4. Abre la carpeta normalizada del equipo. Si ya existe, úsala; si no existe, créala con ese nombre.
5. Copia allí el PDF con el nombre `<equipo-normalizado>-guia-rapida.pdf`.

Ejemplo de ruta completa dentro del repositorio:

```text
assets/documentos/guias-rapidas/analizador-de-desfibrilador-da-2006p/analizador-de-desfibrilador-da-2006p-guia-rapida.pdf
```

Algunas carpetas ya contienen un archivo `.tex`, que es el archivo editable de la guía en LaTeX. Consérvalo y agrega el PDF terminado en la misma carpeta. Si también actualizaste el `.tex` o sus imágenes, incluye esos cambios al subir. El `.tex` por sí solo no aparece como un documento PDF en el catálogo.

#### Subir un manual

1. Abre el manual y comprueba que sea un PDF legible del equipo y modelo correctos.
2. Dentro del proyecto, entra en `assets → documentos → manuales`.
3. Busca la carpeta existente del equipo y copia allí el archivo. Las carpetas actuales pueden tener espacios y tildes; no necesitas renombrarlas.
4. Para un manual nuevo, usa el nombre `<equipo-normalizado>-manual.pdf`. Si el equipo todavía no tiene carpeta, crea una dentro de `manuales`, usando el nombre normalizado del equipo.

Ejemplo usando la carpeta existente del analizador de desfibrilador:

```text
assets/documentos/manuales/Analizador desfibrilador/analizador-de-desfibrilador-da-2006p-manual.pdf
```

El catálogo también admite los nombres originales de los manuales que ya existen. Si vas a actualizar uno, reemplaza el archivo en su ruta actual para conservar el enlace y evitar duplicarlo. Para agregar distintos manuales de un mismo equipo, usa nombres que los distingan e incluyan el modelo, por ejemplo `analizador-de-desfibrilador-da-2006p-manual-de-servicio.pdf`.

Los PDF cuyo nombre comienza con `!` o `?` se excluyen del catálogo. Usa un nombre sin esos prefijos para un documento validado y listo para publicarse.

### 6. Actualizar el catálogo para que aparezcan en la página

**Este paso es necesario al agregar, eliminar o cambiar de nombre un PDF.** La página utiliza el archivo `manual-data.js` como catálogo. Copiar los documentos a su carpeta no actualiza ese archivo automáticamente; el comando de build tampoco lo regenera.

1. En el Explorador, abre la carpeta principal del proyecto: la que contiene `package.json`, `equipment-data.js` y `manual-data.js`.
2. Haz clic en la barra de direcciones del Explorador, escribe `powershell` y presiona **Enter**. Se abrirá una terminal en esa carpeta.
3. Copia este comando en la terminal y presiona **Enter**:

   ```powershell
   node scripts/generate-manual-data.mjs
   ```

4. Espera a que vuelva a aparecer la línea donde puedes escribir. Si no muestra errores, el catálogo se generó; es normal que no aparezca un mensaje de éxito.
5. Regresa a GitHub Desktop. Si agregaste un documento o cambiaste su ruta, debe aparecer también `manual-data.js` en **Changes**. Inclúyelo junto con los PDF.

Si solo reemplazaste el contenido de un PDF conservando exactamente su nombre y carpeta, el catálogo puede quedar igual y no aparecer como modificado.

No necesitas ejecutar `npm install` para este comando: el generador utiliza funciones incluidas en Node.js. Tampoco necesitas editar `manual-data.js` a mano.

El generador intenta asociar cada PDF con un equipo de `equipment-data.js` según el nombre y la ruta. Por eso es importante incluir el modelo correcto y verificar después el equipo asignado en la página. Si el equipo aún no está en el selector, pide al responsable que lo registre antes de cargar sus documentos.

### 7. Guardar los cambios en GitHub Desktop (commit)

1. Vuelve a GitHub Desktop y abre la pestaña **Changes**.
2. Revisa la lista: deben estar tus PDF y, cuando corresponda, `manual-data.js` y los archivos editables o imágenes que actualizaste.
3. Deja marcados los archivos de esta carga. Si aparecen archivos ajenos a tu trabajo, desmárcalos sin descartarlos. GitHub Desktop puede no mostrar una vista previa del PDF; revísalo abriéndolo desde el Explorador.
4. En **Summary**, escribe una descripción breve, por ejemplo:

   ```text
   Agrega guía rápida y manual del analizador DA-2006P
   ```

5. El campo **Description** es opcional; puedes usarlo para explicar qué versión del documento agregaste.
6. Haz clic en **Commit to main**, o en **Commit to** seguido del nombre de tu rama si estás trabajando en otra rama.

El commit guarda los cambios en tu computadora. Todavía falta enviarlos a GitHub. Referencia: [revisar cambios y crear un commit](https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop).

### 8. Enviar los cambios a GitHub (push)

1. Haz clic en **Push origin**, en la parte superior de GitHub Desktop.
2. Espera a que termine la transferencia. Si la aplicación indica que hay cambios nuevos en GitHub, usa **Fetch origin** y **Pull origin** cuando corresponda; después vuelve a intentar **Push origin**.
3. Abre **Repository → View on GitHub** y comprueba, en la rama donde trabajaste, que estén los documentos y el commit que acabas de enviar.

Si aparece un conflicto al actualizar, pide ayuda al responsable para combinar los cambios antes de continuar.

Referencia: [enviar cambios a GitHub desde Desktop](https://docs.github.com/en/desktop/making-changes-in-a-branch/pushing-changes-to-github-from-github-desktop).

### 9. Verificar que los documentos se vean en el sitio

1. Confirma que los cambios ya estén en la rama que se publica. Si usaste una rama de trabajo, primero debe completarse su revisión e integración.
2. Espera a que finalice la publicación del sitio. Subir archivos a GitHub y publicar la página son procesos distintos; si no hay publicación automática configurada, avisa al responsable para que la ejecute.
3. Abre el sitio, entra al repositorio de recursos y selecciona el equipo y el tipo de documento.
4. Comprueba que cada documento aparezca bajo el equipo correcto y que **Abrir** muestre el PDF actualizado. Si ves una versión anterior, recarga con **Ctrl + F5**.

El proceso de build copia `assets/documentos` a `dist/assets/documentos`. Trabaja en `assets/documentos`; `dist` es una carpeta generada y está excluida de Git.

Para comprobar el enlace de un QR, usa la dirección del sitio seguida de la ruta indicada al inicio, por ejemplo `/?equipo=analizador-de-desfibrilador-da-2006p`.

### Si el proyecto requiere una rama y revisión

Si no se permite subir directamente a `main`, realiza este recorrido:

1. Después de actualizar `main` en el paso 4 y antes de copiar archivos, abre **Current Branch → New Branch** y crea una rama, por ejemplo `documentos-da-2006p`.
2. Completa los pasos de copia, generación del catálogo y commit en esa rama.
3. Haz clic en **Publish branch** si es una rama nueva; en envíos posteriores aparecerá **Push origin**.
4. Usa **Preview Pull Request → Create Pull Request**. En la página de GitHub, comprueba que la rama de destino sea `main`, agrega un título que describa los documentos y crea la solicitud.
5. Comparte la solicitud con el responsable para que la revise e integre. Una *pull request* es una solicitud para incorporar tus cambios a la rama principal; hasta que se integre, los documentos no estarán en `main`.
6. Tras la integración, vuelve a `main` en GitHub Desktop y usa **Fetch origin / Pull origin** para actualizar tu copia. Luego realiza la verificación del sitio.

### Problemas frecuentes

| Problema | Qué revisar |
| --- | --- |

| No aparecen archivos en **Changes**. | Confirma que abriste el repositorio correcto y copiaste los PDF dentro de esa copia local, en `assets/documentos`. Si el contenido es idéntico al existente, no habrá cambios. |
| `node` no se reconoce como comando. | Instala Node.js 22.13.0 o superior y abre una terminal nueva. |
| El generador dice que no encuentra el script o `equipment-data.js`. | Abre PowerShell desde la carpeta principal del proyecto, no desde `assets/documentos`. |
| El PDF está en GitHub, pero no aparece en la página. | Comprueba el nombre y carpeta, regenera y sube `manual-data.js`, y verifica que los cambios se hayan publicado. Las guías deben terminar en `-guia-rapida.pdf`. |
| El PDF aparece con otro equipo. | Revisa que el nombre incluya el equipo y modelo correctos, y que esté en su carpeta; regenera el catálogo y vuelve a subir los cambios. |
| Aparece **Pendiente** o el enlace no abre. | Confirma que el PDF esté en la ruta del catálogo y que se haya incluido en la publicación del sitio. |
| No puedes hacer push o aparece una propuesta de crear un fork. | Comprueba la cuenta con la que iniciaste sesión y solicita permiso de escritura al administrador. Un fork es una copia separada; no actualiza por sí solo este repositorio. |

Para las siguientes cargas, comienza en el **paso 4** y repite hasta el **paso 9**.
