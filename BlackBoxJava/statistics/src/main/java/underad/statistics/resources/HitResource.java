package underad.statistics.resources;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import underad.statistics.core.Response;
import underad.statistics.views.HitView;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;

@Slf4j
@Path("/hit/{id}")
@Produces("application/javascript")
public class HitResource {
    @Context
    JedisPool jedis;

    public static final String REDIS_HIT_KEY = "hit";

    @GET
    public HitView hit(@PathParam("id") String id) {
        if (id == null) {
            // Still count bad requests
            id = "";
        }

        Jedis redis = jedis.getResource();
        redis.incr(REDIS_HIT_KEY + ":" + id);
        jedis.returnResource(redis);

        // Currently we're using the same (static) honeypot id. It would be preferable to use a per-hit id for the
        // honeypot, ie. generate one every hit (expire after X) and only count a successful honeypot hit when the
        // honeypot id exists.
        return new HitView(id);
    }
}
