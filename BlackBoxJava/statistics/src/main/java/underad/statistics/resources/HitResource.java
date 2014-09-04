package underad.statistics.resources;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import redis.clients.jedis.JedisPool;
import underad.statistics.core.Response;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;

@Slf4j
@Path("/hit")
@Produces(MediaType.APPLICATION_JSON)
public class HitResource {
    @Context
    JedisPool jedis;

    public static final String REDIS_HIT_KEY = "hit";

    @GET
    public Response hit(@PathParam("id") String id) {
        log.info("hit");
        if (id == null) {
            // Still count bad requests
            id = "";
        }
        jedis.getResource().incr(REDIS_HIT_KEY + ":" + id);
        return new Response();
    }
}
