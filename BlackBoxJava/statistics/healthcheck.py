import os
import os.path
import urllib2
import json
import string

def main():
    serviceunhealthfile = '/opt/underad/statistics/healthfiles/service.down'
    service_was_unhealthy = os.path.isfile(serviceunhealthfile)
    try:
        health = json.loads(urllib2.urlopen('http://localhost:9090/admin/healthcheck').read())
        touch('/opt/underad/statistics/healthfiles/running')
        if service_was_unhealthy:
            print "Statistics service is back up"
            os.remove(serviceunhealthfile)

        for key,value in health.iteritems():
            unhealthfile = "/opt/underad/statistics/healthfiles/%s.unhealthy" % sanitize(key)
            was_unhealthy = os.path.isfile(unhealthfile)

            if not value['healthy'] == True:
                if not was_unhealthy:
                    print "Statistics service: %s is unhealthy!" % key
                touch(unhealthfile)
            else:
                if was_unhealthy:
                    print "Statistics service: %s is now healthy" % key
                    os.remove(unhealthfile)
    except:
        if not service_was_unhealthy:
            print "Statistics service is down!"
        touch(serviceunhealthfile)

def sanitize(filename):
    valid_chars = "-_.()%s%s" % (string.ascii_letters, string.digits)
    return ''.join(c for c in filename if c in valid_chars)


def touch(fname, times=None):
    with open(fname, 'a'):
        os.utime(fname, times)

if __name__ == '__main__':
    main()
