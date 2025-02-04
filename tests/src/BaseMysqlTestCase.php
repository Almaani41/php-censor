<?php

declare(strict_types=1);

namespace Tests\PHPCensor;

use Phinx\Config\Config as PhinxConfig;
use Phinx\Console\Command\Migrate;
use PHPCensor\ArrayConfiguration;
use PHPCensor\Common\Application\ConfigurationInterface;
use PHPCensor\DatabaseManager;
use PHPCensor\StoreRegistry;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Input\ArgvInput;
use Symfony\Component\Console\Output\ConsoleOutput;
use Symfony\Component\Console\Output\OutputInterface;

class BaseMysqlTestCase extends TestCase
{
    protected ?\PDO $connection = null;

    protected ConfigurationInterface $configuration;
    protected DatabaseManager $databaseManager;
    protected StoreRegistry $storeRegistry;

    protected function generatePhinxConfig(): PhinxConfig
    {
        $phinxSettings = [
            'paths' => [
                'migrations' => ROOT_DIR . 'src/Migrations',
            ],
            'environments' => [
                'default_migration_table' => 'migrations',
                'default_database'        => 'php-censor',
                'php-censor'              => [
                    'adapter' => 'mysql',
                    'host' => '127.0.0.1',
                    'name' => env('MYSQL_DBNAME'),
                    'user' => env('MYSQL_USER'),
                    'pass' => env('MYSQL_PASSWORD'),
                ],
            ],
        ];

        return new PhinxConfig($phinxSettings);
    }

    protected function migrateDatabaseScheme(): void
    {
        try {
            (new Migrate())
                ->setConfig($this->generatePhinxConfig())
                ->setName('php-censor-migrations:migrate')
                ->run(new ArgvInput([]), new ConsoleOutput(OutputInterface::VERBOSITY_QUIET));
        } catch (\Throwable $e) {
            //var_dump($e);
        }
    }

    protected function getTestData(): array
    {
        return [];
    }

    protected function migrateDatabaseData(): void
    {
        $testData = $this->getTestData();
        foreach ($testData as $table => $data) {
            $fieldNames = \array_keys($data[0]);
            foreach ($fieldNames as &$fieldName) {
                $fieldName = \sprintf('`%s`', $fieldName);
            }
            unset($fieldName);
            $fieldsString = \implode(',', $fieldNames);

            $recordStrings = [];
            foreach ($data as $record) {
                foreach ($record as &$fieldValue) {
                    if (\is_string($fieldValue)) {
                        $fieldValue = \sprintf("'%s'", $fieldValue);
                    }
                }
                unset($fieldValue);
                $recordStrings[] = '(' . \implode(',', $record) . ')';
            }
            $recordsStrings = \implode(',', $recordStrings);

            $query = \sprintf('INSERT INTO `%s` (%s) VALUES %s', $table, $fieldsString, $recordsStrings);

            $this->connection->exec($query);
        }
    }

    protected function dropTables(): void
    {
        $this->connection->exec('DROP TABLE IF EXISTS `migrations`');
        $this->connection->exec('DROP TABLE IF EXISTS `webhook_requests`');
        $this->connection->exec('DROP TABLE IF EXISTS `build_errors`');
        $this->connection->exec('DROP TABLE IF EXISTS `build_metas`');
        $this->connection->exec('DROP TABLE IF EXISTS `builds`');
        $this->connection->exec('DROP TABLE IF EXISTS `environments`');
        $this->connection->exec('DROP TABLE IF EXISTS `projects`');
        $this->connection->exec('DROP TABLE IF EXISTS `project_groups`');
        $this->connection->exec('DROP TABLE IF EXISTS `secrets`');
        $this->connection->exec('DROP TABLE IF EXISTS `users`');
    }

    protected function generateAppConfiguration(): ConfigurationInterface
    {
        $configurationArray = [
            'php-censor' => [
                'database' => [
                    'servers'  => [
                        'read'  => [
                            ['host' => '127.0.0.1'],
                        ],
                        'write' => [
                            ['host' => '127.0.0.1'],
                        ],
                    ],
                    'type'     => 'mysql',
                    'name'     => env('MYSQL_DBNAME'),
                    'username' => env('MYSQL_USER'),
                    'password' => env('MYSQL_PASSWORD'),
                ],
            ],
        ];

        return new ArrayConfiguration($configurationArray);
    }

    protected function setUp(): void
    {
        parent::setUp();

        try {
            $this->connection = new \PDO(
                'mysql:host=127.0.0.1;dbname=' . env('MYSQL_DBNAME'),
                env('MYSQL_USER'),
                env('MYSQL_PASSWORD')
            );

            $this->dropTables();
            $this->migrateDatabaseScheme();
            $this->migrateDatabaseData();
        } catch (\Throwable $e) {
            //var_dump($e);

            $this->connection = null;
        }

        $this->getConnection();

        $this->configuration   = $this->generateAppConfiguration();
        $this->databaseManager = new DatabaseManager($this->configuration);
        $this->storeRegistry   = new StoreRegistry($this->databaseManager);
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        if (null !== $this->connection) {
            $this->dropTables();

            $this->connection = null;
        }
    }

    protected function getConnection(): ?\PDO
    {
        if (null === $this->connection) {
            $this->markTestSkipped('Test skipped because MySQL database/user/extension doesn\'t exist.');
        }

        return $this->connection;
    }
}
