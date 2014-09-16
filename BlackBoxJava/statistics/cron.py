import time

import psycopg2
import psycopg2.extras

import redis

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import re

FROM='"UnderAd Analytics" <underad@glassinsight.co.uk>'

def main():
    db = db_connection()

    cursor = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cursor.execute('SELECT * from publishermapper')
    publishers = cursor.fetchall()

    r = redis.StrictRedis(host='localhost', port=6379)
    global smtp
    smtp = smtplib.SMTP('localhost')
    for publisher in publishers:
        create_report(r, publisher['id'], publisher['name'], publisher['email'])

    smtp.quit()

def db_connection():
    DB_CONN_STRING = "host='localhost' dbname='dashboard' user='dashboard' password='dfg3G3fdsdf3'"
    db = psycopg2.connect(DB_CONN_STRING)
    return db

def create_report(redis, id, name, email):
    print "%s <%s>/%d" % (name, email, id)

    # Gather data
    hits = int(redis.get('hit:%s' % id) or '0')
    hps = int(redis.get('honeypot:%s' % id) or '0')

    print "  %d of %d blocked" % (hits-hps, hits)
    
    if hits > 0:
        send_report(name, email, hits, hps)

        # Clear processed data
        redis.decr('hit:%s' % id, hits)
        redis.decr('honeypot:%s' % id, hps)

def send_report(name, email, hits, hps):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = "UnderAd report for %s" % time.strftime("%Y-%m-%d")
    msg['From'] = FROM
    msg['To'] = "\"%s\" <%s>" % (name.replace('"', ''), re.sub('[><]', '', email))

    html = """\
<h1>%d%% of your ad revenue is blocked!</h1>
<p>Our analytics registered %d page hits, of which %d were from an adblocked browser.</p>\
    """ % ((100 - (hps*100/hits)), hits, (hits-hps))
    text = """\
%d%% of your ad revenue is blocked!

Our analytics registered %d page hits, of which %d were from an adblocked browser.\
    """ % ((100 - (hps*100/hits)), hits, (hits-hps))

    # Record the MIME types of both parts - text/plain and text/html.
    part1 = MIMEText(text, 'plain')
    part2 = MIMEText(html, 'html')

    # Attach parts into message container.
    # According to RFC 2046, the last part of a multipart message, in this case
    # the HTML message, is best and preferred.
    msg.attach(part1)
    msg.attach(part2)

    smtp.sendmail(msg['From'], msg['To'], msg.as_string())


if __name__ == "__main__":
    main()
