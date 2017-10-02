const user = require('./user')
const PluralsightScraper = require('./PluralsightScraper');

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const validPluralsightUrlRegex = /https:\/\/app\.pluralsight\.com\/library\/courses\/.*\/table-of-contents/g;
const courseUrl = process.argv[2];

if (!courseUrl || !courseUrl.match(validPluralsightUrlRegex)) {
    console.log(courseUrl)
    console.error('Must take one argument which is a valid "table of content" url of a course in Pluralsight')
    process.exit(0)
}

console.log('Pluralsight Account Login')
if (user.email != '' && user.password != '') {
    console.log('Logging in from config file...')
    if (!user.email.match(emailRegex)) {
        console.error('Invalid Email !');
        process.exit(0);
    }
    const scraper = new PluralsightScraper(user.email, user.password, courseUrl, user.saveLocation);
    scraper.run();
} else {
    const prompt = require('prompt')
    prompt.message = '';
    prompt.delimiter = '';
    const schema = {
        properties: {
            Email: {
                pattern: emailRegex,
                message: 'Must be a valid Email!',
                required: true
            },
            Password: {
                hidden: true
            }
        }
    };

    prompt.start();
    prompt.get(schema, function (err, result) {

        const scraper = new PluralsightScraper(result.Email, result.Password, courseUrl, user.saveLocation);
        scraper.run();
    });
}
