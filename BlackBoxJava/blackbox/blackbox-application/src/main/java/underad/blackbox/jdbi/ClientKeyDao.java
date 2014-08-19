package underad.blackbox.jdbi;

import org.joda.time.DateTime;
import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.SqlQuery;

public interface ClientKeyDao {
	/**
	 * Retrieves an appropriate key for a given publisher.
	 * 
	 * @param publisherId The publisher whose key is required.
	 * @param publisherTs Publisher app server date/time at the point of generating the page that includes the adverts
	 * we're attempting to augment. Publisher must provide this when calling <code>JsIncludeResource</code> to avoid
	 * edge condition when keys are switched over.
	 * @return The key to be used.
	 */
	@SqlQuery(
		"select key\n" +
		"from publisher_keys\n" +
		"inner join\n" +
		" (\n" +
		"  select publisher, max(effective) maxeffective from test\n" +
		"  where publisher = :publisher_id\n" +
		"  and effective < :publisher_ts\n" +
		"  group by publisher\n" +
		") past_publisher_keys\n" +
		"on publisher_keys.publisher = past_publisher_keys.publisher\n" +
		"and publisher_keys.effective = past_publisher_keys.maxeffective")
	String getKey(@Bind("publisher_id") int publisherId, @Bind("publisher_ts") DateTime publisherTs);
}
