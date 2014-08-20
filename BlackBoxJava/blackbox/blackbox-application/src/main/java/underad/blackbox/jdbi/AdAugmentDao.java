package underad.blackbox.jdbi;

import java.sql.ResultSet;
import java.sql.SQLException;

import org.skife.jdbi.v2.StatementContext;
import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.SqlQuery;
import org.skife.jdbi.v2.sqlobject.customizers.RegisterMapper;
import org.skife.jdbi.v2.tweak.ResultSetMapper;

import underad.blackbox.core.AdvertMetadata;

import com.google.common.collect.ImmutableSet;

@RegisterMapper(AdvertMetadataMapper.class)
public interface AdAugmentDao {
	@SqlQuery("select blocked_abs_xpath, advert_rel_xpath, width_with_unit, height_with_unit where url = :url")
	ImmutableSet<AdvertMetadata> getAdverts(@Bind("url") String url);
}

class AdvertMetadataMapper implements ResultSetMapper<AdvertMetadata> {
	public AdvertMetadata map(int index, ResultSet r, StatementContext ctx) throws SQLException {
		return new AdvertMetadata(
			r.getString("blocked_abs_xpath"),
			r.getString("advert_rel_xpath"),
			r.getString("width_with_unit"),
			r.getString("height_with_unit")
		);
	}
}
