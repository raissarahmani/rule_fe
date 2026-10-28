-- SQL Server. Preview by default. Resolve parents within RMT-RU, never by a fixed ID.
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @ApplyChanges bit = 0;
DECLARE @ParentId int;

IF (SELECT COUNT(*) FROM dbo.Menu WHERE Modul_Code = 'RMT-RU' AND Menu = 'Otorisasi') <> 1
    THROW 50001, 'Expected exactly one RMT-RU Otorisasi parent.', 1;
SELECT @ParentId = id FROM dbo.Menu WHERE Modul_Code = 'RMT-RU' AND Menu = 'Otorisasi';

SELECT id, Menu, Modul_Code, [Parent-id] AS CurrentParent, @ParentId AS ProposedParent
FROM dbo.Menu
WHERE Modul_Code = 'RMT-RU' AND Menu IN ('Daftar Otorisasi Data', 'Riwayat Otorisasi');

IF @ApplyChanges = 0 RETURN;

BEGIN TRY
    BEGIN TRANSACTION;
    IF (SELECT COUNT(*) FROM dbo.Menu WITH (UPDLOCK, HOLDLOCK)
        WHERE Modul_Code = 'RMT-RU' AND Menu = 'Otorisasi') <> 1
        THROW 50002, 'RMT-RU parent changed; review the registration.', 1;
    SELECT @ParentId = id FROM dbo.Menu WITH (UPDLOCK, HOLDLOCK)
    WHERE Modul_Code = 'RMT-RU' AND Menu = 'Otorisasi';
    IF (SELECT COUNT(*) FROM dbo.Menu WITH (UPDLOCK, HOLDLOCK)
        WHERE Modul_Code = 'RMT-RU' AND Menu IN ('Daftar Otorisasi Data', 'Riwayat Otorisasi')) <> 2
        THROW 50003, 'Expected exactly two unique RMT-RU child menus.', 1;
    IF EXISTS (SELECT Menu FROM dbo.Menu WHERE Modul_Code = 'RMT-RU'
        AND Menu IN ('Daftar Otorisasi Data', 'Riwayat Otorisasi') GROUP BY Menu HAVING COUNT(*) <> 1)
        THROW 50004, 'Duplicate RMT-RU child menu.', 1;
    UPDATE dbo.Menu SET [Parent-id] = @ParentId
    OUTPUT inserted.id, inserted.Menu, deleted.[Parent-id] AS PreviousParent, inserted.[Parent-id] AS NewParent
    WHERE Modul_Code = 'RMT-RU' AND Menu IN ('Daftar Otorisasi Data', 'Riwayat Otorisasi');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
