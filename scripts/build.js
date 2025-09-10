const fs = require('fs-extra'); // модуль для роботи з файлами
const path = require('path'); // для роботи з шляхами
const handlebars = require('handlebars');

console.log("Building")

const viewsDir = path.join(__dirname, '../src/views/');
const buildDir= path.join(__dirname, '../build');
const pagesDir = path.join(viewsDir, 'pages');
const partialsDir = path.join(viewsDir, 'partials');
const scriptsSrcDir = path.join(__dirname, '../src/scripts');
const scriptsDestDir = path.join(buildDir, 'scripts');

fs.emptyDirSync(buildDir); // видалення старого білда
fs.copy(scriptsSrcDir, scriptsDestDir);

const extractScripts = (templateContent) => {
    const match = templateContent.match(/{{!--\s*scripts:\s*(\[.*?\])\s*--}}/s);
    if(match){
        try{
            return JSON.parse(match[1])
        }catch (err){
            console.log("❌ Error", err)
        }
    }
    return [];
}

// записуємо в mainTemplateSource весь зміст файлу main.hbs
const mainTemplateSource = fs.readFileSync(
    path.join(viewsDir, 'layouts/main.hbs'),
    'utf8'
)

// компіляція mainTemplateSource. Фактично ця змінна готова до того щоб генерувати сторінки html
const mainTemplate = handlebars.compile(mainTemplateSource);

// перебір всіх файлів в папці partials
fs.readdirSync(partialsDir).forEach(file => {
    // витягуємо назву файлу без розширення
    const partialName = path.basename(file, '.hbs');
    // витягуємо вміст кожної частинки
    const partialContent = fs.readFileSync(path.join(partialsDir, file), 'utf8');
    // реєструємо кожну частинку в обєкті handlebars
    handlebars.registerPartial(partialName, partialContent);
})

fs.readdirSync(pagesDir).forEach(file => {
    // витягуємо назву файлу без розширення
    const pageName = path.basename(file, '.hbs');
    // витягуємо вміст кожної сторінки
    const pageContent = fs.readFileSync(path.join(pagesDir, file), 'utf8');
    // компіляція сторінки
    const pageTemplate = handlebars.compile(pageContent);

    let scripts = extractScripts(pageContent);

    // пошук скриптів в partials
    fs.readdirSync(partialsDir).forEach(partialFile => {
        const partialContent = fs.readFileSync(path.join(partialsDir, partialFile), 'utf8');
        const partialName = path.basename(partialFile, '.hbs');
        // чи використовується скрипт на сторінці
        const usedInPage = pageContent.includes(`{{> ${partialName}}}`);
        if(usedInPage){
            // пошук скриптів частинок
            const partialScripts = extractScripts(partialContent);
            // додавання нових скриптів до загального масиву скриптів сторінки
            scripts = [...scripts, ...partialScripts];
            // scripts = scripts.concat(partialScripts);
        }
    })

    scripts = [...new Set(scripts)];


    // Робимо фінальний рендер сторінки на основі загального темплейта (mainTemplate)
    const finalHTML = mainTemplate({
        title: pageName,
        body: pageTemplate({}),
        scripts
    })
    // створюємо файл з вмістом finalHTML формату - html і назвою - pageName
    fs.writeFileSync(path.join(buildDir, `${pageName}.html`), finalHTML);

})

console.log("Build complete")