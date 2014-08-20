package underad.blackbox;

import io.dropwizard.Application;
import io.dropwizard.client.HttpClientBuilder;
import io.dropwizard.db.DataSourceFactory;
import io.dropwizard.jdbi.DBIFactory;
import io.dropwizard.migrations.MigrationsBundle;
import io.dropwizard.setup.Bootstrap;
import io.dropwizard.setup.Environment;

import org.apache.http.client.HttpClient;
import org.skife.jdbi.v2.DBI;

import underad.blackbox.client.HttpConsumer;
import underad.blackbox.health.BlackboxHealthCheck;
import underad.blackbox.jdbi.AdAugmentDao;
import underad.blackbox.jdbi.PublisherKeyDao;
import underad.blackbox.resources.JsIncludeResource;
import underad.blackbox.resources.ReconstructResource;

public class BlackboxApplication extends Application<BlackboxConfiguration> {
	
	public static void main(String[] args) throws Exception {
		new BlackboxApplication().run(args);
	}
	
	@Override
	public void initialize(Bootstrap<BlackboxConfiguration> bootstrap) {
	    bootstrap.addBundle(new MigrationsBundle<BlackboxConfiguration>() {
	        @Override
            public DataSourceFactory getDataSourceFactory(BlackboxConfiguration configuration) {
                return configuration.getDataSourceFactory();
            }
	    });
	}
	
	@Override
	public void run(BlackboxConfiguration config, Environment env) throws Exception {
		// TODO replace as much of this as possible with dependency injection (use Dagger)
		
	    DBIFactory factory = new DBIFactory();
	    DBI jdbi = factory.build(env, config.getDataSourceFactory(), "database");
	    
	    HttpClient httpClient = new HttpClientBuilder(env).using(config.getHttpClient()).build("http_client");
	    
		AdAugmentDao adAugmentDao = jdbi.onDemand(AdAugmentDao.class);
		PublisherKeyDao publisherKeyDao = jdbi.onDemand(PublisherKeyDao.class);
		
		HttpConsumer httpConsumer = new HttpConsumer(httpClient);
		ReconstructResource reconstructResource = new ReconstructResource(httpConsumer);
		env.jersey().register(reconstructResource);

		JsIncludeResource jsIncludeResource = new JsIncludeResource(adAugmentDao, publisherKeyDao);
		env.jersey().register(jsIncludeResource);
		
		BlackboxHealthCheck healthCheck = new BlackboxHealthCheck(config.getTemplate());
		env.healthChecks().register("template", healthCheck);
	}
}
