const ProgressBar = require('progress');
const Nightmare = require('nightmare');
const http = require('http');
const fs = require("fs");
// Path to save the videos to
var savePath = '';
var numberOfFiles, completed, saveTo, progress = 0;
var sectionNumber = 0, currentSection, courseNumber = 0;
var gv_courses = [];

class PluralsightScraper {

    constructor(email, password, target, savePathParam) {
        
        savePath = savePathParam;
        // Nightmare instance
        this.nightmare = Nightmare({ 
            show: false,
            webPreferences: {
                images: false
            } 
        });
        // Login details
        this.user = {
            email: '',
            password: ''
        };
        this.user.email = email;
        this.user.password = password;
        // Link to the table of contents of the course you want
        this.target = target;
    }

    run() {
        console.log("Logging in...")

        this.nightmare
        .goto('https://app.pluralsight.com/id/')
        .insert('#Username', this.user.email)
        .insert('#Password', this.user.password)
        .click('button.button.primary')
        .wait(5000)
        .goto(this.target)
        .wait(5000)
        .evaluate(function () {
            var courses = [];
            document.querySelectorAll(".table-of-contents__clip-list-item a").forEach((course) => {
                courses.push({
                    section: course.parentNode.parentNode.parentNode.parentNode.querySelector('.table-of-contents__title a').text,
                    name: course.text,
                    url: course.href
                })
            })
            
            return {
                courses: courses.filter((thing) => thing.url),
                title: document.title
            }
        })
        .then((module) => {
            numberOfFiles = module.courses.length;
        
            if (!numberOfFiles){
                console.error("Wrong login credentials!")
                process.exit(1)
                return;
            }
            console.log("Logged in!")
            saveTo = module.title.replace(" | Pluralsight", "");
            console.log(`Downloading "${saveTo}" from PluralSight, ${numberOfFiles} videos`)
            progress = new ProgressBar(':current/:total [:bar] :percent :etas\n', { total: numberOfFiles, callback: this.terminate.bind(this) })
            console.log('Scraping video urls...')

            if (fs.existsSync('jsons/' + this.safeName(saveTo) + '.json')) {
                console.log('Videos already scraped ! Loading urls...')
                gv_courses = JSON.parse(fs.readFileSync('jsons/The 35 Things Everyone Needs to Know About Dynamics CRM.json').toString());
                this.terminate();
            } else {
                var tasks = module.courses.map((course, index) => (
                    (callback) => {
                        this.scrape(course, index, callback)
                    }
                ))
                require("async.parallellimit")(tasks, 1, function () {
                });
            }
            
        }).catch((e) => console.log(e))
    }

    scrape(course, index, callback, delay=1500) {
        //console.log('Scraping "' + course.name + '"')
        this.nightmare.goto(course.url)
            .wait("video")
            .wait(1500)
            .evaluate(() => {
                var src = document.querySelector("video").src
                return src
            })
            .then((result) => {

                if (!result) {
                    progress.interrupt("Something went wrong. Retrying...")
                    this.scrape(course, index, callback, delay+500)
                    return
                }

                course.src = result
                this.saveVideo(course, index + 1)
                progress.tick();
                callback();
            }).catch((e) => console.log(e))
    }

    saveVideo(course, number) {
        gv_courses.push(course);
    }

    downloadCourses(courses, index, callback) {
        
        // Create download directory if not exists
        if (!fs.existsSync(savePath + "/")) {
            fs.mkdirSync(savePath + "/");
        }
        // Create course folder in download directory if not exists
        saveTo = this.safeName(saveTo)
        if (!fs.existsSync(savePath + "/" + saveTo)) {
            fs.mkdirSync(savePath + "/" + saveTo);
            // Save the courses.json to avoid scraping next time
            fs.createWriteStream(savePath + "/" + saveTo + "/course.json").write(JSON.toString(courses));
        }

        if (currentSection != this.safeName(courses[index].section)) {
            sectionNumber++;
            courseNumber = 1;
        }
        currentSection = this.safeName(courses[index].section)
        if (!fs.existsSync(savePath + "/" + saveTo + "/" + sectionNumber + ". " + currentSection)) {
            fs.mkdirSync(savePath + "/" + saveTo + "/" + sectionNumber + ". " + currentSection);
        }

        if (fs.existsSync(savePath + "/" + saveTo + "/" + sectionNumber + ". " + currentSection + "/" + courseNumber + ". " + this.safeName(courses[index].name) + ".mp4")) {
            if (index + 1 == courses.length) {
                callback();
                return;
            }
            size = undefined;
            courseNumber++;
            this.downloadCourses(courses, index + 1, callback);
        }
        var size = undefined;
        var file = fs.createWriteStream(savePath + "/" + saveTo + "/" + sectionNumber + ". " + currentSection + "/" + courseNumber + ". " + this.safeName(courses[index].name) + ".mp4");
        var progress = undefined;
        http.get(courses[index].src,(response) => {
            response.pipe(file);
            if (!size) {
                size = response.headers['content-length']
                console.log('Downloading "' + courses[index].name + '":')
                progress = new ProgressBar(/*:current/:total*/ (index + 1)  + ' of ' + courses.length + ' Files : [:bar] :percent :rate b/s :etas', { total: parseInt(response.headers['content-length']) })
            }
            response.on('data', (chunk) => {
                progress.tick(chunk.length)
            })

            response.on('end', () => {
                if (index + 1 == courses.length) {
                    callback();
                    return;
                }
                size = undefined;
                courseNumber++;
                this.downloadCourses(courses, index + 1, callback);
            })
        });

    } 

    terminate() {
        console.log('Downloading courses...');

        if (!fs.existsSync('jsons')) {
            fs.mkdirSync('jsons');
        }

        if (!fs.existsSync('jsons/' + saveTo.replace(/:|\?|!|\\|\/|\.|\"/g,'') + '.json')) {
            fs.writeFileSync('jsons/' + saveTo.replace(/:|\?|!|\\|\/|\.|\"/g,'') + '.json', JSON.stringify(gv_courses));
        }
        
        this.downloadCourses(gv_courses, 0, () => {
            console.log("Operation Completed!")
            process.exit(0);
        });
    }

    safeName(name){
        return name.replace(/:|\?|!|\\|\/|\.|\"/g,'');
    }

}

module.exports = PluralsightScraper;