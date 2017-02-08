const axios = require('axios');
const htmlparser = require('htmlparser');
process.stdin.resume();
process.stdin.setEncoding('utf8');
var util = require('util');

/**
 * Instructions
 * 1. import file into node.
 * var Crawler = require('./Crawler.js')
 * 2. create new Crawler instance by passing in list of urls to crawl.
 * var crawler = new Crawler(['https://www.google.com']); 
 * 3. run crawler
 * crawler.run();
 * 
 * The crawler can be paused at any point by pressing p, then resumed with crawler.resume();
 * 
 * When paused:
 * access found numbers with crawler.numbers
 * access remaining links with crawler.links
 * 
 */


const phone = /((\(\d{3}\) ?)|(\d{3}-))?\d{3}-\d{4}/g;

class Crawler {

  constructor(links) {
    this.links = links;
    this.seenLinks = new Set(links);
    this.numbers = [];
    this.processed = 0;
    this.handler = new htmlparser.DefaultHandler((err, dom) => {
      if (err) {
        return console.error('unable to parse link');
      }
      this.getLinks(dom, 'https://www.google.com');
    });
    this.parser = new htmlparser.Parser(this.handler);
    this.input = '';
  }

  run() {
    if (this.paused) {
      this.resume();
      return;
    }
    process.stdin.on('data', text => {
      if (text === 'p' && !this.paused) {
        this.paused = true;
        this.printStatus('PAUSED');
      }
    });
    this.retrievePage(this.links.unshift());
  }

  resume() {
    this.paused = false;
    this.next();
  }

  printStatus(link) {
    process.stdout.write('\x1Bc');
    if (this.paused) {
      console.log('Call resume on the crawler to resume (crawler.resume)');
    } else {
      console.log('Press P to pause');
    }
    console.log('Processing Link: ', link);
    console.log('Remaining links: ', this.links.length);
    console.log('Total Links Processed: ', this.processed);
    console.log('Total Numbers Found: ', this.numbers.length);
  }

  getLinks(html, baseUrl) {
    let q = html;
    while (q.length) {
      let current = q.shift();
      if (current.name === 'a') {
        let url = current.attribs.href;
        if (!url) continue;
        if (url[0] === '/') {
          url = baseUrl + url;
        }
        if (!this.seenLinks.has(url)) {
          this.seenLinks.add(url);
          this.links.push(url);
        }
      }
      if (current.children) {
        current.children.forEach(child => q.push(child));
      }
    }
  }

  next() {
    if (this.paused) return;
    if (this.links.length) {
      const link = this.links.pop();
      this.processed++;
      this.printStatus(link);
      this.retrievePage(link);
    } else {
      console.log('finished!');
    }
  }

  retrievePage(url) {
    axios.get(url).then(resp => {
      if (!/html/.test(resp.headers['content-type'])) {
        return this.next();
      }
      this.processPage(resp.data);
    }).catch(err => {
      console.error('error retreiving link');
      this.next();
    });
  }

  processPage(data) {
    let numbers = data.match(phone);
    if (numbers) {
      this.numbers = this.numbers.concat(numbers);
    }
    this.parser.parseComplete(data);
    if (this.links.length) {
      this.next();
    } else {
      console.log('finished!');
    }
  }

}

module.exports = Crawler;