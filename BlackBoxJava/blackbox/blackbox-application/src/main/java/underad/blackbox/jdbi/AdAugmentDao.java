package underad.blackbox.jdbi;

import java.sql.ResultSet;
import java.sql.SQLException;

import lombok.AllArgsConstructor;
import lombok.Data;

import org.skife.jdbi.v2.StatementContext;
import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.SqlQuery;
import org.skife.jdbi.v2.sqlobject.customizers.RegisterMapper;
import org.skife.jdbi.v2.tweak.ResultSetMapper;

import com.google.common.collect.ImmutableSet;

@RegisterMapper(AdvertMetadataMapper.class)
public interface AdAugmentDao {
	@SqlQuery("select blocked_abs_xpath, advert_rel_xpath where url = :url")
	ImmutableSet<AdvertMetadata> getAdverts(@Bind("url") String url);

	@AllArgsConstructor
	@Data
	public static class AdvertMetadata {
		private String blockedAbsXpath;
		private String advertRelXpath;
	}
}

class AdvertMetadataMapper implements ResultSetMapper<AdAugmentDao.AdvertMetadata> {
	public AdAugmentDao.AdvertMetadata map(int index, ResultSet r, StatementContext ctx) throws SQLException {
		return new AdAugmentDao.AdvertMetadata(r.getString("blocked_abs_xpath"), r.getString("advert_rel_xpath"));
	}
}
