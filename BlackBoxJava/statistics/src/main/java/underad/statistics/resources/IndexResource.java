package underad.statistics.resources;

import lombok.extern.slf4j.Slf4j;
import redis.clients.jedis.JedisPool;
import underad.statistics.views.HitView;
import underad.statistics.views.IndexView;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;

@Slf4j
@Path("/")
@Produces(MediaType.TEXT_HTML)
public class IndexResource {
    @GET
    public IndexView index() {
        return new IndexView();
    }
}
